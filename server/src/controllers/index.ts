import { events } from './events';

// Explicit annotation: avoids TS2742 under pnpm.
const controllers: Record<string, unknown> = { events };

export default controllers;
