import { describe, expect, it, vi } from 'vitest';

import { subscribeUploadLifecycle } from '../server/src/lifecycles/upload-file';

const makeStrapi = (ctx: any) => {
  let subscriber: any;
  const fileQuery = { findOne: vi.fn(async () => ({ id: 155, name: '04.svg', url: '/uploads/04.svg', mime: 'image/svg+xml', size: 1.2 })) };
  const knexChain = { where: vi.fn().mockReturnThis(), count: vi.fn().mockReturnThis(), first: vi.fn(async () => ({ n: '3' })) };
  const strapi = {
    db: {
      lifecycles: { subscribe: vi.fn((s: any) => { subscriber = s; }) },
      query: vi.fn(() => fileQuery),
      connection: vi.fn(() => knexChain),
    },
    requestContext: { get: vi.fn(() => ctx) },
    log: { warn: vi.fn() },
  } as any;
  return { strapi, getSubscriber: () => subscriber, fileQuery, knexChain };
};

describe('upload beforeDelete lifecycle', () => {
  it('subscribes to plugin::upload.file only', () => {
    const { strapi, getSubscriber } = makeStrapi({ state: {} });
    subscribeUploadLifecycle(strapi);
    expect(getSubscriber().models).toEqual(['plugin::upload.file']);
  });

  it('parks the file identity and relation count on ctx.state.auditFiles', async () => {
    const ctx = { state: {} as any };
    const { strapi, getSubscriber, fileQuery, knexChain } = makeStrapi(ctx);
    subscribeUploadLifecycle(strapi);
    await getSubscriber().beforeDelete({ params: { where: { id: 155 } } });
    expect(fileQuery.findOne).toHaveBeenCalledWith({ where: { id: 155 }, select: ['id', 'name', 'url', 'mime', 'size'] });
    expect(knexChain.where).toHaveBeenCalledWith({ file_id: 155 });
    expect(ctx.state.auditFiles).toEqual([{ id: 155, name: '04.svg', url: '/uploads/04.svg', mime: 'image/svg+xml', size: 1.2, relatedCount: 3 }]);
  });

  it('appends on bulk deletes', async () => {
    const ctx = { state: { auditFiles: [{ id: 1 }] } as any };
    const { strapi, getSubscriber } = makeStrapi(ctx);
    subscribeUploadLifecycle(strapi);
    await getSubscriber().beforeDelete({ params: { where: { id: 155 } } });
    expect(ctx.state.auditFiles).toHaveLength(2);
  });

  it('does nothing outside a request (no ctx) and never throws', async () => {
    const { strapi, getSubscriber, fileQuery } = makeStrapi(null);
    subscribeUploadLifecycle(strapi);
    await expect(getSubscriber().beforeDelete({ params: { where: { id: 1 } } })).resolves.toBeUndefined();
    expect(fileQuery.findOne).not.toHaveBeenCalled();
    const broken = makeStrapi({ state: {} });
    broken.fileQuery.findOne.mockRejectedValueOnce(new Error('nope'));
    subscribeUploadLifecycle(broken.strapi);
    await expect(broken.getSubscriber().beforeDelete({ params: { where: { id: 1 } } })).resolves.toBeUndefined();
    expect(broken.strapi.log.warn).toHaveBeenCalled();
  });
});
