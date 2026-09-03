import type { Core } from '@strapi/strapi';

import type { AuditFile } from '../middlewares/audit';

const FILE_UID = 'plugin::upload.file';

/**
 * The HTTP layer only sees `DELETE /upload/files/155`. This hook runs before the row is gone,
 * reads the file's identity and how many entries referenced it, and parks it on the current
 * request so the middleware can embed it in the `media.delete` row. Bulk deletes call remove()
 * per file, so the hook appends.
 */
export const subscribeUploadLifecycle = (strapi: Core.Strapi): void => {
  strapi.db.lifecycles.subscribe({
    models: [FILE_UID],
    async beforeDelete(event: { params?: { where?: Record<string, unknown> } }) {
      try {
        const ctx = strapi.requestContext.get() as { state: Record<string, unknown> } | undefined | null;
        if (!ctx) return;
        const where = event.params?.where;
        if (!where) return;

        const file = (await strapi.db.query(FILE_UID).findOne({ where, select: ['id', 'name', 'url', 'mime', 'size'] })) as
          | { id: number; name: string; url: string; mime: string | null; size: number | null }
          | null;
        if (!file) return;

        const row = (await strapi.db.connection('files_related_mph').where({ file_id: file.id }).count({ n: '*' }).first()) as
          | { n: number | string }
          | undefined;
        const relatedCount = Number(row?.n ?? 0);

        const parked: AuditFile = { ...file, relatedCount };
        const list = (ctx.state.auditFiles as AuditFile[] | undefined) ?? [];
        list.push(parked);
        ctx.state.auditFiles = list;
      } catch (err) {
        strapi.log.warn(`[audit-log] upload beforeDelete enrichment failed: ${(err as Error).message}`);
      }
    },
  });
};
