export const EVENT_UID = 'plugin::audit-log.event';

/** One row per recorded admin action. Append-only; hidden from CM and CTB. */
export const event = {
  schema: {
    kind: 'collectionType',
    collectionName: 'audit_log_events',
    info: {
      singularName: 'event',
      pluralName: 'events',
      displayName: 'Audit log event',
      description: 'Who did what, when, from which IP (audit-log plugin)',
    },
    options: {
      draftAndPublish: false,
      timestamps: false,
    },
    pluginOptions: {
      'content-manager': { visible: false },
      'content-type-builder': { visible: false },
    },
    indexes: [
      { name: 'audit_log_events_date_idx', columns: ['date'] },
      { name: 'audit_log_events_action_idx', columns: ['action'] },
      { name: 'audit_log_events_user_id_idx', columns: ['user_id'] },
    ],
    attributes: {
      date: { type: 'datetime', required: true },
      action: { type: 'string', required: true, maxLength: 64 },
      userId: { type: 'integer' },
      userEmail: { type: 'string', maxLength: 255 },
      userName: { type: 'string', maxLength: 255 },
      ip: { type: 'string', maxLength: 64 },
      userAgent: { type: 'text' },
      method: { type: 'string', maxLength: 8 },
      path: { type: 'text' },
      status: { type: 'integer' },
      model: { type: 'string', maxLength: 255 },
      targetDocumentId: { type: 'string', maxLength: 255 },
      entityId: { type: 'string', maxLength: 64 },
      locale: { type: 'string', maxLength: 16 },
      details: { type: 'json' },
    },
  },
};
