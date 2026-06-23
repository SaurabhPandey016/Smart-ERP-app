import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { env } from './config/env.js';
import { notFound, errorHandler } from './middleware/error.middleware.js';
import { authenticate } from './middleware/auth.middleware.js';
import { companyContext } from './middleware/company.middleware.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import companyRoutes from './routes/company.routes.js';
import ledgerRoutes from './routes/ledger.routes.js';
import stockRoutes from './routes/stock.routes.js';
import voucherRoutes from './routes/voucher.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import customerRoutes from './routes/customer.routes.js';
import supplierRoutes from './routes/supplier.routes.js';
import reportRoutes from './routes/report.routes.js';

const app = express();

// ── Security & Parsing Middleware
app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
if (env.isDev) app.use(morgan('dev'));

// ── Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', env: env.NODE_ENV, timestamp: new Date().toISOString() });
});

// ── Public Auth Routes
app.use('/api/auth', authRoutes);

// ── Protected Routes (require JWT)
app.use('/api/companies', authenticate, companyRoutes);

// ── Company-scoped Routes (require JWT + company ownership)
app.use('/api/:companyId/ledgers',    authenticate, companyContext, ledgerRoutes);
app.use('/api/:companyId/stock',      authenticate, companyContext, stockRoutes);
app.use('/api/:companyId/vouchers',   authenticate, companyContext, voucherRoutes);
app.use('/api/:companyId/inventory',  authenticate, companyContext, inventoryRoutes);
app.use('/api/:companyId/customers',  authenticate, companyContext, customerRoutes);
app.use('/api/:companyId/suppliers',  authenticate, companyContext, supplierRoutes);
app.use('/api/:companyId/reports',    authenticate, companyContext, reportRoutes);

// ── Error Handling
app.use(notFound);
app.use(errorHandler);

// ── Start Server
app.listen(env.PORT, () => {
  console.log(`\n🚀 SmartERP Server running on http://localhost:${env.PORT}`);
  console.log(`   Environment : ${env.NODE_ENV}`);
  console.log(`   Client URL  : ${env.CLIENT_URL}\n`);
});

export default app;
