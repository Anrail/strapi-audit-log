import { describe, expect, it, vi } from 'vitest';

import { events as controller } from '../server/src/controllers/events';

const makeStrapi = () => {
  const svc = { find: vi.fn(async () => ({ results: [], pagination: {} })), stats: vi.fn(async () => ({ total: 0, oldest: null, retentionDays: 180 })), countBefore: vi.fn(async () => 5), purge: vi.fn(async () => ({ count: 5 })) };
  const strapi = { plugin: vi.fn(() => ({ service: vi.fn(() => svc) })) } as any;
  return { strapi, svc };
};

const makeCtx = (over: Record<string, unknown> = {}) => ({
  query: {}, request: { body: {}, ip: '127.0.0.1' }, headers: { 'x-forwarded-for': '1.1.1.1' }, get: (h: string) => (h === 'user-agent' ? 'ua' : ''),
  state: { user: { id: 1, email: 'a@b.c', firstname: 'A', lastname: 'B' } }, body: undefined as unknown, status: 200,
  badRequest: vi.fn((msg: string) => { throw new Error(`400 ${msg}`); }),
  ...over,
});

describe('events controller', () => {
  it('find parses numbers and passes filters through', async () => {
    const { strapi, svc } = makeStrapi();
    const ctx = makeCtx({ query: { page: '2', pageSize: '50', action: 'media.delete', userId: '3', ip: '9.9', from: '2026-09-01T00:00:00.000Z', to: '2026-09-03T00:00:00.000Z', q: 'x' } });
    await controller({ strapi }).find(ctx as any);
    expect(svc.find).toHaveBeenCalledWith({ page: 2, pageSize: 50, action: 'media.delete', userId: 3, ip: '9.9', from: '2026-09-01T00:00:00.000Z', to: '2026-09-03T00:00:00.000Z', q: 'x' });
  });

  it('find rejects an unknown action', async () => {
    const { strapi } = makeStrapi();
    await expect(controller({ strapi }).find(makeCtx({ query: { action: 'entry.nuke' } }) as any)).rejects.toThrow(/400/);
  });

  it('actions returns the vocabulary', async () => {
    const { strapi } = makeStrapi();
    const ctx = makeCtx();
    await controller({ strapi }).actions(ctx as any);
    expect((ctx.body as any).actions).toContain('media.delete');
  });

  it('purgeCount validates the date', async () => {
    const { strapi, svc } = makeStrapi();
    const ctx = makeCtx({ query: { before: '2026-09-01T00:00:00.000Z' } });
    await controller({ strapi }).purgeCount(ctx as any);
    expect(svc.countBefore).toHaveBeenCalledWith('2026-09-01T00:00:00.000Z');
    await expect(controller({ strapi }).purgeCount(makeCtx({ query: { before: 'yesterday' } }) as any)).rejects.toThrow(/400/);
  });

  it('purge requires confirm=true and passes the actor with IP', async () => {
    const { strapi, svc } = makeStrapi();
    await expect(controller({ strapi }).purge(makeCtx({ request: { body: { before: null } } }) as any)).rejects.toThrow(/400/);
    const ctx = makeCtx({ request: { body: { before: null, confirm: true }, ip: '127.0.0.1' } });
    await controller({ strapi }).purge(ctx as any);
    expect(svc.purge).toHaveBeenCalledWith({ before: null, actor: { userId: 1, userEmail: 'a@b.c', userName: 'A B', ip: '1.1.1.1', userAgent: 'ua' } });
    expect(ctx.body).toEqual({ count: 5 });
  });
});
