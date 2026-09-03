import type { Core } from '@strapi/strapi';

const destroy = ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.plugin('audit-log').service('retention').stop();
};

export default destroy;
