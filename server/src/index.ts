/**
 * Application methods
 */
import bootstrap from "./bootstrap";
import destroy from "./destroy";
import register from "./register";

/**
 * Plugin server methods
 */
import config from "./config";
import contentTypes from "./content-types";
import controllers from "./controllers";
import middlewares from "./middlewares";
import policies from "./policies";
import routes from "./routes";
import services from "./services";

const plugin: Record<string, unknown> = {
  register,
  bootstrap,
  destroy,
  config,
  controllers,
  routes,
  services,
  contentTypes,
  policies,
  middlewares,
};
// Explicit annotation: avoids TS2742 (pnpm cannot portably name Core.Strapi in emitted d.ts).
export default plugin;