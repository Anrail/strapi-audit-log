const read = [
  'admin::isAuthenticatedAdmin',
  { name: 'admin::hasPermissions', config: { actions: ['plugin::audit-log.read'] } },
];
const purge = [
  'admin::isAuthenticatedAdmin',
  { name: 'admin::hasPermissions', config: { actions: ['plugin::audit-log.purge'] } },
];

export default {
  type: 'admin',
  routes: [
    { method: 'GET', path: '/events', handler: 'events.find', config: { policies: read } },
    { method: 'GET', path: '/stats', handler: 'events.stats', config: { policies: read } },
    { method: 'GET', path: '/actions', handler: 'events.actions', config: { policies: read } },
    { method: 'GET', path: '/purge/count', handler: 'events.purgeCount', config: { policies: purge } },
    { method: 'POST', path: '/purge', handler: 'events.purge', config: { policies: purge } },
  ],
};
