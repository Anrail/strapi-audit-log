import { describe, expect, it } from 'vitest';

import { classify } from '../server/src/utils/classify';

const cases: Array<[string, string, ReturnType<typeof classify>]> = [
  // never recorded
  ['GET', '/content-manager/collection-types/api::x.x', null],
  ['POST', '/admin/renew-token', null],
  ['POST', '/admin/access-token', null],
  ['POST', '/audit-log/purge', null],
  ['POST', '/api/articles', null],
  ['POST', '/graphql', null],
  // admin auth
  ['POST', '/admin/login', { action: 'admin-auth.login' }],
  ['POST', '/admin/logout', { action: 'admin-auth.logout' }],
  ['POST', '/admin/forgot-password', { action: 'admin-auth.reset' }],
  ['POST', '/admin/reset-password', { action: 'admin-auth.reset' }],
  ['POST', '/admin/register', { action: 'user.create' }],
  ['POST', '/admin/register-admin', { action: 'user.create' }],
  // collection types
  ['POST', '/content-manager/collection-types/api::one-project.one-project', { action: 'entry.create', model: 'api::one-project.one-project' }],
  ['PUT', '/content-manager/collection-types/api::one-project.one-project/mwg2p8us', { action: 'entry.update', model: 'api::one-project.one-project', documentId: 'mwg2p8us' }],
  ['DELETE', '/content-manager/collection-types/api::one-project.one-project/mwg2p8us', { action: 'entry.delete', model: 'api::one-project.one-project', documentId: 'mwg2p8us' }],
  ['POST', '/content-manager/collection-types/api::a.a/doc1/actions/publish', { action: 'entry.publish', model: 'api::a.a', documentId: 'doc1' }],
  ['POST', '/content-manager/collection-types/api::a.a/doc1/actions/unpublish', { action: 'entry.unpublish', model: 'api::a.a', documentId: 'doc1' }],
  ['POST', '/content-manager/collection-types/api::a.a/doc1/actions/discard', { action: 'entry.discard', model: 'api::a.a', documentId: 'doc1' }],
  ['POST', '/content-manager/collection-types/api::a.a/actions/bulkDelete', { action: 'entry.delete', model: 'api::a.a' }],
  ['POST', '/content-manager/collection-types/api::a.a/actions/bulkPublish', { action: 'entry.publish', model: 'api::a.a' }],
  ['POST', '/content-manager/collection-types/api::a.a/actions/bulkUnpublish', { action: 'entry.unpublish', model: 'api::a.a' }],
  ['POST', '/content-manager/collection-types/api::a.a/clone/src1', { action: 'entry.create', model: 'api::a.a', documentId: 'src1' }],
  // single types
  ['PUT', '/content-manager/single-types/api::main.main', { action: 'entry.update', model: 'api::main.main' }],
  ['DELETE', '/content-manager/single-types/api::main.main', { action: 'entry.delete', model: 'api::main.main' }],
  ['POST', '/content-manager/single-types/api::main.main/actions/publish', { action: 'entry.publish', model: 'api::main.main' }],
  // media
  ['POST', '/upload', { action: 'media.create' }],
  ['DELETE', '/upload/files/155', { action: 'media.delete', entityId: '155' }],
  ['POST', '/upload/files/155', { action: 'media.update', entityId: '155' }],
  ['POST', '/upload/actions/bulk-delete', { action: 'media.delete' }],
  ['POST', '/upload/actions/bulk-move', { action: 'media.update' }],
  ['POST', '/upload/folders', { action: 'media-folder.create' }],
  ['PUT', '/upload/folders/14', { action: 'media-folder.update', entityId: '14' }],
  ['DELETE', '/upload/folders/14', { action: 'media-folder.delete', entityId: '14' }],
  // users / roles
  ['POST', '/admin/users', { action: 'user.create' }],
  ['PUT', '/admin/users/3', { action: 'user.update', entityId: '3' }],
  ['DELETE', '/admin/users/3', { action: 'user.delete', entityId: '3' }],
  ['POST', '/admin/users/batch-delete', { action: 'user.delete' }],
  ['PUT', '/admin/users/me', { action: 'user.update' }],
  ['POST', '/admin/roles', { action: 'role.create' }],
  ['PUT', '/admin/roles/2', { action: 'role.update', entityId: '2' }],
  ['DELETE', '/admin/roles/2', { action: 'role.delete', entityId: '2' }],
  ['PUT', '/admin/roles/2/permissions', { action: 'permission.update', entityId: '2' }],
  // content-type builder
  ['POST', '/content-type-builder/content-types', { action: 'content-type.create' }],
  ['PUT', '/content-type-builder/content-types/api::a.a', { action: 'content-type.update', model: 'api::a.a' }],
  ['DELETE', '/content-type-builder/content-types/api::a.a', { action: 'content-type.delete', model: 'api::a.a' }],
  ['POST', '/content-type-builder/components', { action: 'component.create' }],
  ['DELETE', '/content-type-builder/components/location.location', { action: 'component.delete', model: 'location.location' }],
  // fallback
  ['POST', '/i18n/locales', { action: 'admin.other' }],
  ['PUT', '/users-permissions/roles/1', { action: 'admin.other' }],
  // trailing slash and query string are ignored
  ['DELETE', '/upload/files/9/', { action: 'media.delete', entityId: '9' }],
  ['delete', '/upload/files/9?x=1', { action: 'media.delete', entityId: '9' }],
];

describe('classify(method, path)', () => {
  it.each(cases)('%s %s', (method, path, expected) => {
    expect(classify(method, path)).toEqual(expected);
  });
});
