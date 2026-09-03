import type { Core } from '@strapi/strapi';

import { CONFIG_UID, type AuditConfig } from '../config';
import { EVENT_UID } from '../content-types/event';
import type { Action } from '../utils/actions';

export interface EventInput {
  date: string;
  action: Action;
  userId: number | null;
  userEmail: string | null;
  userName: string | null;
  ip: string;
  userAgent: string;
  method: string;
  path: string;
  status: number;
  model: string | null;
  targetDocumentId: string | null;
  entityId: string | null;
  locale: string | null;
  details: Record<string, unknown>;
}

export interface FindQuery {
  page?: number;
  pageSize?: number;
  action?: string;
  userId?: number;
  ip?: string;
  from?: string;
  to?: string;
  q?: string;
}

export interface Actor {
  userId: number | null;
  userEmail: string | null;
  userName: string | null;
  ip: string;
  userAgent: string;
}

const MAX_PAGE_SIZE = 100;

const clamp = (v: string | null, max: number): string | null =>
  v === null || v === undefined ? null : String(v).slice(0, max);

const buildWhere = (q: FindQuery): Record<string, unknown> => {
  const where: Record<string, unknown> = {};
  if (q.action) where.action = q.action;
  if (q.userId !== undefined && q.userId !== null && !Number.isNaN(q.userId)) where.userId = q.userId;
  if (q.ip) where.ip = { $containsi: q.ip };
  if (q.from || q.to) {
    const date: Record<string, string> = {};
    if (q.from) date.$gte = q.from;
    if (q.to) date.$lte = q.to;
    where.date = date;
  }
  if (q.q) {
    where.$or = [
      { path: { $containsi: q.q } },
      { targetDocumentId: { $containsi: q.q } },
      { userEmail: { $containsi: q.q } },
    ];
  }
  return where;
};

export const events = ({ strapi }: { strapi: Core.Strapi }) => ({
  /** Insert one row. Never throws — the audit trail must not break requests. */
  async record(input: EventInput): Promise<void> {
    try {
      const data: EventInput = {
        ...input,
        ip: clamp(input.ip, 64) ?? '',
        userEmail: clamp(input.userEmail, 255),
        userName: clamp(input.userName, 255),
        method: clamp(input.method, 8) ?? '',
        model: clamp(input.model, 255),
        targetDocumentId: clamp(input.targetDocumentId, 255),
        entityId: clamp(input.entityId, 64),
        locale: clamp(input.locale, 16),
        path: clamp(input.path, 2048) ?? '',
        userAgent: clamp(input.userAgent, 1024) ?? '',
      };
      await strapi.db.query(EVENT_UID).create({ data });
    } catch (err) {
      strapi.log.warn(`[audit-log] failed to record ${input.action}: ${(err as Error).message}`);
    }
  },

  async find(q: FindQuery) {
    return strapi.db.query(EVENT_UID).findPage({
      where: buildWhere(q),
      orderBy: { date: 'desc' },
      page: q.page && q.page > 0 ? q.page : 1,
      pageSize: Math.min(q.pageSize && q.pageSize > 0 ? q.pageSize : 25, MAX_PAGE_SIZE),
    });
  },

  async stats() {
    const total = await strapi.db.query(EVENT_UID).count({ where: {} });
    const oldestRow = (await strapi.db.query(EVENT_UID).findOne({ select: ['date'], orderBy: { date: 'asc' } })) as
      | { date: string }
      | null;
    const { retentionDays } = strapi.config.get(CONFIG_UID) as AuditConfig;
    return { total, oldest: oldestRow?.date ?? null, retentionDays };
  },

  async countBefore(before: string | null): Promise<number> {
    return strapi.db.query(EVENT_UID).count({ where: before ? { date: { $lt: before } } : {} });
  },

  /** Delete rows older than `before` (all rows when null) and record the purge itself. */
  async purge({ before, actor, automatic = false }: { before: string | null; actor: Actor | null; automatic?: boolean }) {
    const where = before ? { date: { $lt: before } } : { id: { $gt: 0 } };
    const { count } = await strapi.db.query(EVENT_UID).deleteMany({ where });
    if (automatic && count === 0) return { count };
    await this.record({
      date: new Date().toISOString(),
      action: 'audit-log.purge',
      userId: actor?.userId ?? null,
      userEmail: actor?.userEmail ?? (automatic ? 'system' : null),
      userName: actor?.userName ?? (automatic ? 'retention timer' : null),
      ip: actor?.ip ?? '',
      userAgent: actor?.userAgent ?? '',
      method: 'POST',
      path: '/audit-log/purge',
      status: 200,
      model: null,
      targetDocumentId: null,
      entityId: null,
      locale: null,
      details: { before, count, automatic },
    });
    return { count };
  },
});

export type EventsService = ReturnType<typeof events>;
