import type { Core } from '@strapi/strapi';

import { createAuditMiddleware } from './middlewares/audit';

/**
 * Register phase runs before `strapi.server.initMiddlewares()` and `initRouting()`, so this
 * middleware sits first in the Koa chain and wraps every route, including the admin API.
 */
const register = ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.server.use(createAuditMiddleware(strapi));
};

export default register;
