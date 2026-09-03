import type { Core } from '@strapi/strapi';

import { CONFIG_UID, type AuditConfig } from '../config';
import type { EventsService } from './events';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_INTERVAL_MS = 6 * 60 * 60 * 1000;

/**
 * Deletes rows older than `retentionDays`. A plugin-owned timer, not `strapi.cron`: Strapi's
 * server config ships with `cron.enabled: false`, so a cron task would silently never run on
 * projects that did not opt in.
 */
export const retention = ({ strapi }: { strapi: Core.Strapi }) => {
  let timer: NodeJS.Timeout | null = null;

  const service = {
    async runOnce(): Promise<{ count: number }> {
      const { retentionDays } = strapi.config.get(CONFIG_UID) as AuditConfig;
      if (!retentionDays || retentionDays <= 0) return { count: 0 };
      const before = new Date(Date.now() - retentionDays * DAY_MS).toISOString();
      try {
        const eventsService = strapi.plugin('audit-log').service('events') as EventsService;
        const result = await eventsService.purge({ before, actor: null, automatic: true });
        if (result.count > 0) strapi.log.info(`[audit-log] retention removed ${result.count} rows older than ${before}`);
        return result;
      } catch (err) {
        strapi.log.warn(`[audit-log] retention run failed: ${(err as Error).message}`);
        return { count: 0 };
      }
    },

    start(intervalMs: number = DEFAULT_INTERVAL_MS): void {
      if (timer) return;
      void service.runOnce();
      timer = setInterval(() => void service.runOnce(), intervalMs);
      timer.unref?.();
    },

    stop(): void {
      if (timer) clearInterval(timer);
      timer = null;
    },
  };

  return service;
};
