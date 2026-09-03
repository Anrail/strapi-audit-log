import type { Core } from '@strapi/strapi';

import { CONFIG_UID, type AuditConfig } from '../config';
import type { EventInput, EventsService } from '../services/events';
import type { Action } from '../utils/actions';
import { classify } from '../utils/classify';
import { extractIp, readLocale, summarizeBody } from '../utils/request-meta';

interface AdminUser {
  id: number;
  email: string;
  firstname?: string;
  lastname?: string;
}

/** File identity parked on ctx.state by the upload lifecycle (see lifecycles/upload-file.ts). */
export interface AuditFile {
  id: number;
  name: string;
  url: string;
  mime: string | null;
  size: number | null;
  relatedCount: number;
}

const fullName = (user: AdminUser | undefined): string | null => {
  if (!user) return null;
  const name = [user.firstname, user.lastname].filter(Boolean).join(' ').trim();
  return name || null;
};

const capIds = (v: unknown): unknown => (Array.isArray(v) ? v.slice(0, 200) : v);

/** Stores at most 200 ids under `key`; flags `details.truncated` when the source array was longer. */
const setIds = (details: Record<string, unknown>, key: string, value: unknown): void => {
  if (Array.isArray(value) && value.length > 200) details.truncated = true;
  details[key] = capIds(value);
};

/**
 * Global Koa middleware: after the downstream handlers ran, classify the request and record one
 * audit row. Everything after `await next()` is wrapped so the audit trail can never alter the
 * response or throw into the request path.
 */
export const createAuditMiddleware = (strapi: Core.Strapi) => {
  return async (ctx: any, next: () => Promise<unknown>): Promise<void> => {
    await next();
    try {
      const config = strapi.config.get(CONFIG_UID) as AuditConfig;
      if (!config.enabled) return;

      const classified = classify(ctx.method, ctx.path);
      if (!classified) return;

      let { action, entityId } = classified;
      const { model, documentId } = classified;
      const query = (ctx.query ?? {}) as Record<string, unknown>;
      if (action === 'media.create' && query.id) {
        action = 'media.update';
        entityId = String(query.id);
      }
      if (config.excludeActions.includes(action)) return;

      const status: number = ctx.status;
      if (config.logSuccessOnly && status >= 400) return;

      const body = ctx.request?.body as Record<string, unknown> | undefined;
      let user = ctx.state?.user as AdminUser | undefined;
      if (action === 'admin-auth.login') user = (ctx.body as { data?: { user?: AdminUser } } | undefined)?.data?.user;

      const details: Record<string, unknown> = {};
      const referer = ctx.get('referer');
      if (referer) {
        try {
          const url = new URL(referer);
          details.referer = (url.origin + url.pathname).slice(0, 512);
        } catch {
          /* not a valid absolute URL — store nothing */
        }
      }

      if (action === 'admin-auth.login') {
        details.email = typeof body?.email === 'string' ? String(body.email).slice(0, 255) : null;
        details.ok = status < 400;
      } else if (action.startsWith('media')) {
        if (Array.isArray(ctx.state?.auditFiles)) details.files = ctx.state.auditFiles as AuditFile[];
        if (body?.fileIds !== undefined) setIds(details, 'fileIds', body.fileIds);
        if (body?.folderIds !== undefined) setIds(details, 'folderIds', body.folderIds);
        const fields = summarizeBody(body);
        if (fields?.length && !details.files) details.fields = fields;
      } else {
        const fields = summarizeBody(body);
        if (fields?.length) details.fields = fields;
        if (Array.isArray(body?.documentIds)) setIds(details, 'documentIds', body.documentIds);
        if (Array.isArray(body?.ids)) setIds(details, 'ids', body.ids);
      }

      const input: EventInput = {
        date: new Date().toISOString(),
        action: action as Action,
        userId: user?.id ?? null,
        userEmail: user?.email ?? null,
        userName: fullName(user),
        ip: extractIp(ctx.headers ?? {}, ctx.request?.ip ?? ''),
        userAgent: String(ctx.get('user-agent') || '').slice(0, 512),
        method: String(ctx.method).toUpperCase(),
        path: String(ctx.path).slice(0, 1024),
        status,
        model: model ?? null,
        targetDocumentId: documentId ?? null,
        entityId: entityId ?? null,
        locale: readLocale(query) ?? null,
        details,
      };

      const eventsService = strapi.plugin('audit-log').service('events') as EventsService;
      void eventsService.record(input);
    } catch (err) {
      strapi.log.warn(`[audit-log] middleware skipped a request: ${(err as Error).message}`);
    }
  };
};
