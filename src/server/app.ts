// src/server/app.ts
// Wire all route modules into a single Hono app instance. Order matches the
// previous monolithic index.ts so behaviour is identical.

import { Hono } from 'hono';
import { registerComposeRoutes } from './routes/compose';
import { registerDashboardRoutes } from './routes/dashboard';
import { registerManageRoutes } from './routes/manage';
import { registerUndoRoutes } from './routes/undo';
import { registerTriggerRoutes } from './routes/triggers';
import { registerSchedulerRoutes } from './routes/scheduler';
import { registerSettingsRoutes } from './routes/settings';

const app = new Hono();

registerComposeRoutes(app);
registerDashboardRoutes(app);
registerManageRoutes(app);
registerUndoRoutes(app);
registerTriggerRoutes(app);
registerSchedulerRoutes(app);
registerSettingsRoutes(app);

export default app;
