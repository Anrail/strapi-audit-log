/** Action vocabulary — mirrors Strapi Enterprise Audit Logs so the UI reads the same. */
export const ACTIONS = [
  'admin-auth.login',
  'admin-auth.logout',
  'admin-auth.reset',
  'entry.create',
  'entry.update',
  'entry.delete',
  'entry.publish',
  'entry.unpublish',
  'entry.discard',
  'media.create',
  'media.update',
  'media.delete',
  'media-folder.create',
  'media-folder.update',
  'media-folder.delete',
  'user.create',
  'user.update',
  'user.delete',
  'role.create',
  'role.update',
  'role.delete',
  'permission.update',
  'content-type.create',
  'content-type.update',
  'content-type.delete',
  'component.create',
  'component.update',
  'component.delete',
  'audit-log.purge',
  'admin.other',
] as const;

export type Action = (typeof ACTIONS)[number];

export const isAction = (value: unknown): value is Action =>
  typeof value === 'string' && (ACTIONS as readonly string[]).includes(value);
