import { events } from './events';
import { retention } from './retention';

// Explicit annotation: avoids TS2742 (pnpm cannot portably name Core.Strapi in emitted d.ts).
const services: Record<string, unknown> = { events, retention };

export default services;
