import { describe, expect, it, vi } from 'vitest';

import { createAuditMiddleware } from '../server/src/middlewares/audit';

const makeStrapi = (overrides: Partial<{ enabled: boolean; excludeActions: string[]; logSuccessOnly: boolean }> = {}) => {
  const record = vi.fn(async () => undefined);
  const strapi = {
    config: { get: vi.fn(() => ({ enabled: true, retentionDays: 180, excludeActions: [], logSuccessOnly: false, ...overrides })) },
    log: { warn: vi.fn() },
    plugin: vi.fn(() => ({ service: vi.fn(() => ({ record })) })),
  } as any;
  return { strapi, record };
};

const makeCtx = (over: Record<string, unknown> = {}) => {
  const headers: Record<string, string> = { 'x-forwarded-for': '93.109.177.102', 'user-agent': 'Safari', referer: 'https://x/admin/content-manager/collection-types/api::a.a/d1', ...(over.headers as Record<string, string>) };
  return {
    method: 'PUT',
    path: '/content-manager/collection-types/api::a.a/d1',
    query: { 'plugins[i18n][locale]': 'en' },
    headers,
    get: (name: string) => headers[name.toLowerCase()] ?? '',
    request: { body: { title: 'T', password: 'x' }, ip: '127.0.0.1' },
    state: { user: { id: 3, email: 'a@motivepoint.com', firstname: 'Andrzej', lastname: 'Sosinski' } },
    status: 200,
    body: undefined as unknown,
    ...over,
  } as any;
};

const flush = () => new Promise((r) => setImmediate(r));

describe('audit middleware', () => {
  it('records an entry.update after the response with user, ip, locale, field names and referer', async () => {
    const { strapi, record } = makeStrapi();
    const ctx = makeCtx();
    await createAuditMiddleware(strapi)(ctx, async () => undefined);
    await flush();
    expect(record).toHaveBeenCalledTimes(1);
    expect(record.mock.calls[0][0]).toEqual(expect.objectContaining({
      action: 'entry.update', model: 'api::a.a', targetDocumentId: 'd1', userId: 3, userEmail: 'a@motivepoint.com', userName: 'Andrzej Sosinski',
      ip: '93.109.177.102', userAgent: 'Safari', method: 'PUT', path: '/content-manager/collection-types/api::a.a/d1', status: 200, locale: 'en',
      details: { referer: 'https://x/admin/content-manager/collection-types/api::a.a/d1', fields: ['title'] },
    }));
    expect(typeof record.mock.calls[0][0].date).toBe('string');
  });

  it('strips the query string from the recorded referer', async () => {
    const { strapi, record } = makeStrapi();
    const ctx = makeCtx({ headers: { referer: 'https://x/admin/content-manager/collection-types/api::a.a/d1?plugins[i18n][locale]=en' } });
    await createAuditMiddleware(strapi)(ctx, async () => undefined);
    await flush();
    expect(record.mock.calls[0][0].details.referer).toBe('https://x/admin/content-manager/collection-types/api::a.a/d1');
  });

  it('drops an unparseable referer instead of storing it', async () => {
    const { strapi, record } = makeStrapi();
    const ctx = makeCtx({ headers: { referer: 'not-a-url' } });
    await createAuditMiddleware(strapi)(ctx, async () => undefined);
    await flush();
    expect(record.mock.calls[0][0].details.referer).toBeUndefined();
  });

  it('caps documentIds at 200 and flags details.truncated', async () => {
    const { strapi, record } = makeStrapi();
    const documentIds = Array.from({ length: 250 }, (_, i) => `d${i}`);
    const ctx = makeCtx({ request: { body: { documentIds }, ip: '127.0.0.1' } });
    await createAuditMiddleware(strapi)(ctx, async () => undefined);
    await flush();
    const details = record.mock.calls[0][0].details;
    expect(details.documentIds).toHaveLength(200);
    expect(details.truncated).toBe(true);
  });

  it('ignores GET and ignored prefixes', async () => {
    const { strapi, record } = makeStrapi();
    await createAuditMiddleware(strapi)(makeCtx({ method: 'GET' }), async () => undefined);
    await createAuditMiddleware(strapi)(makeCtx({ method: 'POST', path: '/audit-log/purge' }), async () => undefined);
    await flush();
    expect(record).not.toHaveBeenCalled();
  });

  it('records nothing when enabled=false', async () => {
    const { strapi, record } = makeStrapi({ enabled: false });
    await createAuditMiddleware(strapi)(makeCtx(), async () => undefined);
    await flush();
    expect(record).not.toHaveBeenCalled();
  });

  it('records nothing for an excluded action', async () => {
    const { strapi, record } = makeStrapi({ excludeActions: ['entry.update'] });
    await createAuditMiddleware(strapi)(makeCtx(), async () => undefined);
    await flush();
    expect(record).not.toHaveBeenCalled();
  });

  it('logSuccessOnly drops 4xx/5xx rows', async () => {
    const { strapi, record } = makeStrapi({ logSuccessOnly: true });
    await createAuditMiddleware(strapi)(makeCtx({ status: 403 }), async () => undefined);
    await flush();
    expect(record).not.toHaveBeenCalled();
  });

  it('records a 403 attempt by default (evidence)', async () => {
    const { strapi, record } = makeStrapi();
    await createAuditMiddleware(strapi)(makeCtx({ status: 403 }), async () => undefined);
    await flush();
    expect(record.mock.calls[0][0]).toEqual(expect.objectContaining({ status: 403 }));
  });

  it('login: user comes from the response body, details carry email and ok', async () => {
    const { strapi, record } = makeStrapi();
    const ctx = makeCtx({ method: 'POST', path: '/admin/login', state: {}, request: { body: { email: 'a@b.c', password: 'x' }, ip: '127.0.0.1' }, body: { data: { user: { id: 1, email: 'a@b.c', firstname: 'A', lastname: 'B' } } } });
    await createAuditMiddleware(strapi)(ctx, async () => undefined);
    await flush();
    expect(record.mock.calls[0][0]).toEqual(expect.objectContaining({ action: 'admin-auth.login', userId: 1, userEmail: 'a@b.c', details: expect.objectContaining({ email: 'a@b.c', ok: true }) }));
  });

  it('failed login: no user, ok=false, email kept', async () => {
    const { strapi, record } = makeStrapi();
    const ctx = makeCtx({ method: 'POST', path: '/admin/login', status: 400, state: {}, request: { body: { email: 'a@b.c', password: 'x' }, ip: '127.0.0.1' }, body: { error: {} } });
    await createAuditMiddleware(strapi)(ctx, async () => undefined);
    await flush();
    expect(record.mock.calls[0][0]).toEqual(expect.objectContaining({ action: 'admin-auth.login', userId: null, status: 400, details: expect.objectContaining({ email: 'a@b.c', ok: false }) }));
  });

  it('media.delete embeds files parked by the lifecycle and the bulk request ids', async () => {
    const { strapi, record } = makeStrapi();
    const files = [{ id: 155, name: '04.svg', url: '/uploads/04.svg', mime: 'image/svg+xml', size: 1.2, relatedCount: 3 }];
    const ctx = makeCtx({ method: 'POST', path: '/upload/actions/bulk-delete', request: { body: { fileIds: [155], folderIds: [] }, ip: '127.0.0.1' }, state: { user: { id: 3, email: 'a@b.c' }, auditFiles: files } });
    await createAuditMiddleware(strapi)(ctx, async () => undefined);
    await flush();
    expect(record.mock.calls[0][0]).toEqual(expect.objectContaining({ action: 'media.delete', details: expect.objectContaining({ files, fileIds: [155], folderIds: [] }) }));
  });

  it('POST /upload?id=N is media.update of N', async () => {
    const { strapi, record } = makeStrapi();
    const ctx = makeCtx({ method: 'POST', path: '/upload', query: { id: '536' }, request: { body: {}, ip: '127.0.0.1' } });
    await createAuditMiddleware(strapi)(ctx, async () => undefined);
    await flush();
    expect(record.mock.calls[0][0]).toEqual(expect.objectContaining({ action: 'media.update', entityId: '536' }));
  });

  it('never throws into the request even if classification explodes', async () => {
    const { strapi } = makeStrapi();
    const ctx = makeCtx({ path: undefined });
    await expect(createAuditMiddleware(strapi)(ctx, async () => undefined)).resolves.toBeUndefined();
    expect(strapi.log.warn).toHaveBeenCalled();
  });

  it('propagates downstream errors untouched', async () => {
    const { strapi } = makeStrapi();
    await expect(createAuditMiddleware(strapi)(makeCtx(), async () => { throw new Error('boom'); })).rejects.toThrow('boom');
  });
});
