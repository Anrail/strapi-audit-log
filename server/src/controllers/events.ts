import type { Core } from '@strapi/strapi';

import type { Actor, EventsService } from '../services/events';
import { ACTIONS, isAction } from '../utils/actions';
import { extractIp } from '../utils/request-meta';

const isIsoDate = (value: unknown): value is string =>
  typeof value === 'string' && !Number.isNaN(Date.parse(value));

const toInt = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isInteger(n) ? n : undefined;
};

const actorFrom = (ctx: any): Actor => {
  const user = ctx.state?.user ?? {};
  const userName = [user.firstname, user.lastname].filter(Boolean).join(' ').trim() || null;
  return {
    userId: user.id ?? null,
    userEmail: user.email ?? null,
    userName,
    ip: extractIp(ctx.headers ?? {}, ctx.request?.ip ?? ''),
    userAgent: String(ctx.get('user-agent') || '').slice(0, 512),
  };
};

export const events = ({ strapi }: { strapi: Core.Strapi }) => {
  const service = () => strapi.plugin('audit-log').service('events') as EventsService;

  return {
    async find(ctx: any) {
      const q = ctx.query ?? {};
      if (q.action !== undefined && q.action !== '' && !isAction(q.action)) return ctx.badRequest(`unknown action "${q.action}"`);
      if (q.from !== undefined && q.from !== '' && !isIsoDate(q.from)) return ctx.badRequest('from must be an ISO date');
      if (q.to !== undefined && q.to !== '' && !isIsoDate(q.to)) return ctx.badRequest('to must be an ISO date');
      ctx.body = await service().find({
        page: toInt(q.page),
        pageSize: toInt(q.pageSize),
        action: q.action || undefined,
        userId: toInt(q.userId),
        ip: q.ip || undefined,
        from: q.from || undefined,
        to: q.to || undefined,
        q: q.q || undefined,
      });
    },

    async stats(ctx: any) {
      ctx.body = await service().stats();
    },

    async actions(ctx: any) {
      ctx.body = { actions: [...ACTIONS] };
    },

    async purgeCount(ctx: any) {
      const before = ctx.query?.before;
      if (before !== undefined && before !== '' && !isIsoDate(before)) return ctx.badRequest('before must be an ISO date');
      ctx.body = { count: await service().countBefore(before || null) };
    },

    async purge(ctx: any) {
      const body = ctx.request?.body ?? {};
      if (body.confirm !== true) return ctx.badRequest('confirm must be true');
      if (body.before !== null && body.before !== undefined && !isIsoDate(body.before)) return ctx.badRequest('before must be an ISO date or null');
      ctx.body = await service().purge({ before: body.before ?? null, actor: actorFrom(ctx) });
    },
  };
};
