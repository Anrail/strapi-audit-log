import type { Core } from '@strapi/strapi';

import { subscribeUploadLifecycle } from './lifecycles/upload-file';

const RBAC_ACTIONS = [
  { section: 'plugins', displayName: 'Read the audit log', uid: 'read', pluginName: 'audit-log' },
  { section: 'plugins', displayName: 'Purge the audit log', uid: 'purge', pluginName: 'audit-log' },
];

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  await strapi.service('admin::permission').actionProvider.registerMany(RBAC_ACTIONS);
  subscribeUploadLifecycle(strapi);
  strapi.plugin('audit-log').service('retention').start();
};

export default bootstrap;
