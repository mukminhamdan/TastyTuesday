import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadUser, requireAuth, csrfGuard } from './lib/auth.js';
import { errorHandler, HttpError } from './lib/http.js';
import authRoutes from './routes/auth.js';
import customerRoutes from './routes/customers.js';
import bookingRoutes from './routes/bookings.js';
import quotationRoutes from './routes/quotations.js';
import invoiceRoutes from './routes/invoices.js';
import paymentRoutes from './routes/payments.js';
import dashboardRoutes from './routes/dashboard.js';
import reportRoutes from './routes/reports.js';
import publicRoutes from './routes/public.js';
import { settingsRoutes, serviceRoutes, userRoutes, backupRoutes } from './routes/settings.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp(db) {
  const app = express();
  app.disable('x-powered-by');
  if (process.env.TRUST_PROXY) app.set('trust proxy', process.env.TRUST_PROXY);

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'same-origin');
    next();
  });
  app.use(express.json({ limit: '25mb' }));
  app.use(cookieParser());
  app.use(loadUser(db));

  const api = express.Router();
  api.use(csrfGuard);
  api.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  api.get('/health', (req, res) => res.json({ ok: true }));
  api.use('/auth', authRoutes(db));
  api.use('/public', publicRoutes(db));
  api.use(requireAuth);
  api.use('/customers', customerRoutes(db));
  api.use('/bookings', bookingRoutes(db));
  api.use('/quotations', quotationRoutes(db));
  api.use('/invoices', invoiceRoutes(db));
  api.use('/payments', paymentRoutes(db));
  api.use('/dashboard', dashboardRoutes(db));
  api.use('/reports', reportRoutes(db));
  api.use('/settings', settingsRoutes(db));
  api.use('/services', serviceRoutes(db));
  api.use('/users', userRoutes(db));
  api.use('/backup', backupRoutes(db));
  api.use((req, res, next) => next(new HttpError(404, 'Laluan API tidak dijumpai', 'API route not found')));
  app.use('/api', api);

  // Serve the built single-page app.
  const dist = path.resolve(__dirname, '../dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist, { index: false, maxAge: '7d', setHeaders: (res, file) => file.endsWith('.html') && res.setHeader('Cache-Control', 'no-cache') }));
    app.get(/^\/(?!api\/).*/, (req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(dist, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
