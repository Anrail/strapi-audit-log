import type { Action } from './actions';

export interface Classified {
  action: Action;
  model?: string;
  documentId?: string;
  entityId?: string;
}

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Prefixes the middleware never records (public API, GraphQL, our own routes). */
const IGNORED_PREFIXES = ['/api/', '/graphql', '/audit-log/'];

/**
 * Maps a mutating admin request to the audit action vocabulary.
 * Pure: no strapi access. Returns null when the request must not be recorded.
 */
export function classify(method: string, path: string): Classified | null {
  const m = method.toUpperCase();
  if (!MUTATING.has(m)) return null;

  const p = path.split('?')[0].replace(/\/+$/, '') || '/';
  if (IGNORED_PREFIXES.some((prefix) => p === prefix.replace(/\/$/, '') || p.startsWith(prefix))) return null;
  if (p === '/admin/renew-token' || p === '/admin/access-token') return null;

  const isDelete = m === 'DELETE';
  let r: RegExpMatchArray | null;

  // --- admin auth & self-registration
  if (p === '/admin/login') return { action: 'admin-auth.login' };
  if (p === '/admin/logout') return { action: 'admin-auth.logout' };
  if (p === '/admin/forgot-password' || p === '/admin/reset-password') return { action: 'admin-auth.reset' };
  if (p === '/admin/register' || p === '/admin/register-admin') return { action: 'user.create' };

  // --- content manager: collection types
  if ((r = p.match(/^\/content-manager\/collection-types\/([^/]+)\/actions\/(bulkDelete|bulkPublish|bulkUnpublish)$/))) {
    const bulk: Record<string, Action> = {
      bulkDelete: 'entry.delete',
      bulkPublish: 'entry.publish',
      bulkUnpublish: 'entry.unpublish',
    };
    return { action: bulk[r[2]], model: r[1] };
  }
  if ((r = p.match(/^\/content-manager\/collection-types\/([^/]+)\/clone\/([^/]+)$/))) {
    return { action: 'entry.create', model: r[1], documentId: r[2] };
  }
  if ((r = p.match(/^\/content-manager\/collection-types\/([^/]+)\/([^/]+)\/actions\/(publish|unpublish|discard)$/))) {
    return { action: `entry.${r[3]}` as Action, model: r[1], documentId: r[2] };
  }
  if ((r = p.match(/^\/content-manager\/collection-types\/([^/]+)\/([^/]+)$/))) {
    return { action: isDelete ? 'entry.delete' : 'entry.update', model: r[1], documentId: r[2] };
  }
  if ((r = p.match(/^\/content-manager\/collection-types\/([^/]+)$/))) {
    return { action: 'entry.create', model: r[1] };
  }

  // --- content manager: single types
  if ((r = p.match(/^\/content-manager\/single-types\/([^/]+)\/actions\/(publish|unpublish|discard)$/))) {
    return { action: `entry.${r[2]}` as Action, model: r[1] };
  }
  if ((r = p.match(/^\/content-manager\/single-types\/([^/]+)$/))) {
    return { action: isDelete ? 'entry.delete' : 'entry.update', model: r[1] };
  }

  // --- media library
  if (p === '/upload/actions/bulk-delete') return { action: 'media.delete' };
  if (p === '/upload/actions/bulk-move') return { action: 'media.update' };
  if ((r = p.match(/^\/upload\/files\/(\d+)$/))) {
    return { action: isDelete ? 'media.delete' : 'media.update', entityId: r[1] };
  }
  if (p === '/upload') return { action: 'media.create' }; // `?id=N` → media.update, resolved by the middleware
  if ((r = p.match(/^\/upload\/folders\/(\d+)$/))) {
    return { action: isDelete ? 'media-folder.delete' : 'media-folder.update', entityId: r[1] };
  }
  if (p === '/upload/folders') return { action: 'media-folder.create' };

  // --- admin users & roles
  if (p === '/admin/users/batch-delete') return { action: 'user.delete' };
  if (p === '/admin/users/me') return { action: 'user.update' };
  if ((r = p.match(/^\/admin\/users\/(\d+)$/))) {
    return { action: isDelete ? 'user.delete' : 'user.update', entityId: r[1] };
  }
  if (p === '/admin/users') return { action: 'user.create' };
  if ((r = p.match(/^\/admin\/roles\/(\d+)\/permissions$/))) return { action: 'permission.update', entityId: r[1] };
  if ((r = p.match(/^\/admin\/roles\/(\d+)$/))) {
    return { action: isDelete ? 'role.delete' : 'role.update', entityId: r[1] };
  }
  if (p === '/admin/roles') return { action: 'role.create' };

  // --- content-type builder
  if ((r = p.match(/^\/content-type-builder\/(content-types|components)(?:\/([^/]+))?$/))) {
    const kind = r[1] === 'components' ? 'component' : 'content-type';
    const verb = isDelete ? 'delete' : r[2] ? 'update' : 'create';
    const out: Classified = { action: `${kind}.${verb}` as Action };
    if (r[2]) out.model = r[2];
    return out;
  }

  return { action: 'admin.other' };
}
