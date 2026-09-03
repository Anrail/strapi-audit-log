import { describe, expect, it, vi } from 'vitest';

import { events } from '../server/src/services/events';

const UID = 'plugin::audit-log.event';

const makeStrapi = (config = { enabled: true, retentionDays: 180, excludeActions: [], logSuccessOnly: false }) => {
  const query = {
    create: vi.fn(async (args: unknown) => args),
    findPage: vi.fn(async () => ({ results: [], pagination: { page: 1, pageSize: 25, pageCount: 0, total: 0 } })),
    count: vi.fn(async () => 0),
    findOne: vi.fn(async () => null),
    deleteMany: vi.fn(async () => ({ count: 0 })),
  };
  const strapi = {
    config: { get: vi.fn(() => config) },
    log: { warn: vi.fn(), info: vi.fn() },
    db: { query: vi.fn((uid: string) => { if (uid !== UID) throw new Error(`unexpected uid ${uid}`); return query; }) },
  } as any;
  return { strapi, query };
};

const actor = { userId: 1, userEmail: 'a@b.c', userName: 'A B', ip: '1.1.1.1', userAgent: 'ua' };
const input = { date: '2026-09-03T10:00:00.000Z', action: 'entry.update' as const, ...actor, method: 'PUT', path: '/x', status: 200, model: 'api::a.a', targetDocumentId: 'd', entityId: null, locale: 'en', details: {} };

describe('events.record', () => {
  it('inserts the row', async () => {
    const { strapi, query } = makeStrapi();
    await events({ strapi }).record(input);
    expect(query.create).toHaveBeenCalledWith({ data: input });
  });
  it('swallows insert errors and warns', async () => {
    const { strapi, query } = makeStrapi();
    query.create.mockRejectedValueOnce(new Error('db down'));
    await expect(events({ strapi }).record(input)).resolves.toBeUndefined();
    expect(strapi.log.warn).toHaveBeenCalledWith(expect.stringContaining('db down'));
  });
  it('clamps oversized fields before insert so long rows never overflow varchar(255)', async () => {
    const { strapi, query } = makeStrapi();
    const oversized = {
      ...input,
      path: 'p'.repeat(400),
      userAgent: 'u'.repeat(400),
      ip: 'i'.repeat(300),
      entityId: 'e'.repeat(100),
    };
    await events({ strapi }).record(oversized);
    const written = query.create.mock.calls[0][0].data;
    expect(written.path.length).toBe(400);
    expect(written.userAgent.length).toBe(400);
    expect(written.ip.length).toBe(64);
    expect(written.entityId.length).toBe(64);
    expect(strapi.log.warn).not.toHaveBeenCalled();
  });
});

describe('events.find', () => {
  it('builds the where clause from the filters, newest first, pageSize capped at 100', async () => {
    const { strapi, query } = makeStrapi();
    await events({ strapi }).find({ page: 2, pageSize: 500, action: 'media.delete', userId: 3, ip: '93.109', from: '2026-09-01T00:00:00.000Z', to: '2026-09-03T00:00:00.000Z', q: 'mwg2' });
    expect(query.findPage).toHaveBeenCalledWith({
      where: {
        action: 'media.delete',
        userId: 3,
        ip: { $containsi: '93.109' },
        date: { $gte: '2026-09-01T00:00:00.000Z', $lte: '2026-09-03T00:00:00.000Z' },
        $or: [{ path: { $containsi: 'mwg2' } }, { targetDocumentId: { $containsi: 'mwg2' } }, { userEmail: { $containsi: 'mwg2' } }],
      },
      orderBy: { date: 'desc' },
      page: 2,
      pageSize: 100,
    });
  });
  it('defaults to page 1 / 25 rows and an empty where', async () => {
    const { strapi, query } = makeStrapi();
    await events({ strapi }).find({});
    expect(query.findPage).toHaveBeenCalledWith({ where: {}, orderBy: { date: 'desc' }, page: 1, pageSize: 25 });
  });
});

describe('events.stats / countBefore', () => {
  it('reports total, oldest date and retention', async () => {
    const { strapi, query } = makeStrapi();
    query.count.mockResolvedValueOnce(42);
    query.findOne.mockResolvedValueOnce({ date: '2026-08-01T00:00:00.000Z' });
    expect(await events({ strapi }).stats()).toEqual({ total: 42, oldest: '2026-08-01T00:00:00.000Z', retentionDays: 180 });
    expect(query.findOne).toHaveBeenCalledWith({ select: ['date'], orderBy: { date: 'asc' } });
  });
  it('countBefore counts rows older than the cut-off, or all rows when null', async () => {
    const { strapi, query } = makeStrapi();
    await events({ strapi }).countBefore('2026-09-01T00:00:00.000Z');
    expect(query.count).toHaveBeenCalledWith({ where: { date: { $lt: '2026-09-01T00:00:00.000Z' } } });
    await events({ strapi }).countBefore(null);
    expect(query.count).toHaveBeenLastCalledWith({ where: {} });
  });
});

describe('events.purge', () => {
  it('deletes rows before the cut-off and records an audit-log.purge row for the actor', async () => {
    const { strapi, query } = makeStrapi();
    query.deleteMany.mockResolvedValueOnce({ count: 7 });
    const result = await events({ strapi }).purge({ before: '2026-09-01T00:00:00.000Z', actor });
    expect(result).toEqual({ count: 7 });
    expect(query.deleteMany).toHaveBeenCalledWith({ where: { date: { $lt: '2026-09-01T00:00:00.000Z' } } });
    expect(query.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'audit-log.purge', userId: 1, userEmail: 'a@b.c', ip: '1.1.1.1', method: 'POST', path: '/audit-log/purge', status: 200, details: { before: '2026-09-01T00:00:00.000Z', count: 7, automatic: false } }),
    });
  });
  it('clears everything when before is null', async () => {
    const { strapi, query } = makeStrapi();
    query.deleteMany.mockResolvedValueOnce({ count: 3 });
    await events({ strapi }).purge({ before: null, actor });
    expect(query.deleteMany).toHaveBeenCalledWith({ where: { id: { $gt: 0 } } });
  });
  it('automatic purge with zero rows writes no audit row', async () => {
    const { strapi, query } = makeStrapi();
    await events({ strapi }).purge({ before: '2026-01-01T00:00:00.000Z', actor: null, automatic: true });
    expect(query.create).not.toHaveBeenCalled();
  });
});
