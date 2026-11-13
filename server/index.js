import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { config } from './config.js';
import { initDatabase } from './db/index.js';
import { seedDatabase } from './db/seed.js';
import { authenticate } from './middleware/auth.js';

import authRoutes from './routes/auth.js';
import customerRoutes from './routes/customers.js';
import quoteRoutes from './routes/quotes.js';
import publicQuoteRoutes from './routes/publicQuote.js';
import contractRoutes from './routes/contracts.js';
import rentalRoutes from './routes/rentals.js';
import { customerRentalRouter, adminRentalRouter } from './routes/rentalFlow.js';
import productRoutes from './routes/products.js';
import partnerRoutes from './routes/partners.js';
import analyticsRoutes from './routes/analytics.js';
import settingsRoutes from './routes/settings.js';
import landingRoutes from './routes/landing.js';

// 1. Initialize DB & Seed if empty
initDatabase();
seedDatabase();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(authenticate);

// Subdomain detection middleware (for partner dedicated landing pages)
app.use((req, res, next) => {
  const host = req.headers.host || '';
  const hostName = host.split(':')[0].toLowerCase();

  // Skip IP addresses (e.g. 127.0.0.1, 192.168.x.x) and plain localhost
  if (!hostName || hostName === 'localhost' || /^(\d{1,3}\.){3}\d{1,3}$/.test(hostName) || hostName.startsWith('::')) {
    return next();
  }

  let subdomain = null;
  if (hostName.endsWith('.localhost')) {
    subdomain = hostName.slice(0, -'.localhost'.length);
  } else {
    const parts = hostName.split('.');
    if (parts.length >= 3) {
      subdomain = parts[0];
    }
  }

  const ignoreSubs = ['www', 'admin', 'api', 'app', 'crm', 'mail', 'localhost'];
  if (subdomain && !ignoreSubs.includes(subdomain)) {
    req.partnerSubdomain = subdomain;
    if (!req.query.partner) {
      req.query.partner = subdomain;
    }
    // If requesting root on a partner subdomain, redirect to landing
    if (req.method === 'GET' && req.path === '/') {
      return res.redirect(`/landing/?partner=${encodeURIComponent(subdomain)}`);
    }
  }
  next();
});

// 2. Static Uploads directory
app.use('/uploads', express.static(config.uploadsDir));

// 3. API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/public/quotes', publicQuoteRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/rental', customerRentalRouter);
app.use('/api/admin/rental-applications', adminRentalRouter);
app.use('/api/products', productRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/landing', landingRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'KCC HomeCC CRM 3.0',
    company: '(주)라이프앤조이',
    time: new Date().toISOString()
  });
});

// 4. Serve Frontend Static Files
if (fs.existsSync(config.publicDir)) {
  // /admin 접속 시 메인 통합 CRM 어드민으로 연결
  app.get(['/admin', '/admin/'], (req, res) => {
    return res.sendFile(path.join(config.publicDir, 'admin', 'index.html'));
  });

  app.use(express.static(config.publicDir));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      if (req.path === '/landing' || req.path.startsWith('/landing/')) {
        return res.sendFile(path.join(config.publicDir, 'landing', 'index.html'));
      }
      if (req.path === '/admin' || req.path.startsWith('/admin/')) {
        return res.sendFile(path.join(config.publicDir, 'admin', 'index.html'));
      }
      return res.sendFile(path.join(config.publicDir, 'index.html'));
    }
    next();
  });
}

// 5. Error Handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: err.message || '서버 내부 오류가 발생했습니다.' });
});

// Process exception handlers
process.on('uncaughtException', err => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// 6. Start Server
const server = app.listen(config.port, config.host, () => {
  console.log(`======================================================`);
  console.log(` KCC HomeCC CRM 3.0 Operational Server Started`);
  console.log(` URL: http://127.0.0.1:${config.port}`);
  console.log(` Operator: (주)라이프앤조이`);
  console.log(` Database: ${config.dbPath}`);
  console.log(`======================================================`);
});

server.on('error', err => {
  console.error('Server listen error:', err);
});
