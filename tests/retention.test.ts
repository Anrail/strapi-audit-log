import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { retention } from '../server/src/services/retention';

const makeStrapi = (retentionDays: number) => {
  const purge = vi.fn(async () => ({ count: 2 }));
  const strapi = {
    config: { get: vi.fn(() => ({ enabled: true, retentionDays, excludeActions: [], logSuccessOnly: false })) },
    log: { info: vi.fn(), warn: vi.fn() },
    plugin: vi.fn(() => ({ service: vi.fn(() => ({ purge })) })),
  } as any;
  return { strapi, purge };
};

describe('retention', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('runOnce purges rows older than retentionDays with automatic=true', async () => {
    vi.setSystemTime(new Date('2026-09-03T00:00:00.000Z'));
    const { strapi, purge } = makeStrapi(30);
    expect(await retention({ strapi }).runOnce()).toEqual({ count: 2 });
    expect(purge).toHaveBeenCalledWith({ before: '2026-08-04T00:00:00.000Z', actor: null, automatic: true });
  });

  it('runOnce is a no-op when retentionDays is 0', async () => {
    const { strapi, purge } = makeStrapi(0);
    expect(await retention({ strapi }).runOnce()).toEqual({ count: 0 });
    expect(purge).not.toHaveBeenCalled();
  });

  it('start runs immediately and then on every interval; stop halts it', async () => {
    const { strapi, purge } = makeStrapi(30);
    const svc = retention({ strapi });
    svc.start(1000);
    await vi.advanceTimersByTimeAsync(0);
    expect(purge).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(2000);
    expect(purge).toHaveBeenCalledTimes(3);
    svc.stop();
    await vi.advanceTimersByTimeAsync(5000);
    expect(purge).toHaveBeenCalledTimes(3);
  });

  it('a failing purge is logged, not thrown', async () => {
    const { strapi, purge } = makeStrapi(30);
    purge.mockRejectedValueOnce(new Error('locked'));
    await expect(retention({ strapi }).runOnce()).resolves.toEqual({ count: 0 });
    expect(strapi.log.warn).toHaveBeenCalledWith(expect.stringContaining('locked'));
  });
});
