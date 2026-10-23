import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';

import { errorHandler } from './middleware/errorHandler';
import { getRedisStatus } from './config/redis';
import mongoose from 'mongoose';

// Import Route Handlers
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import projectRoutes from './routes/projectRoutes';
import patentRoutes from './routes/patentRoutes';
import disclosureRoutes from './routes/disclosureRoutes';
import agreementRoutes from './routes/agreementRoutes';
import filingRoutes from './routes/filingRoutes';
import complianceRoutes from './routes/complianceRoutes';
import collaborationRoutes from './routes/collaborationRoutes';
import documentRoutes from './routes/documentRoutes';
import deadlineRoutes from './routes/deadlineRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import reportRoutes from './routes/reportRoutes';
import searchRoutes from './routes/searchRoutes';
import activityLogRoutes from './routes/activityLogRoutes';

const app: Application = express();

// Security and utility middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  process.env.CORS_ORIGIN || '',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('Blocked by CORS policy'));
      }
    },
    credentials: true,
  })
);

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Static file serving for uploads
const uploadsDir = path.resolve(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsDir));

// System Health & Diagnostics endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
  const redisInfo = getRedisStatus();

  res.status(200).json({
    status: 'Operational',
    timestamp: new Date().toISOString(),
    platform: 'BioVault Biotechnology IP & Compliance Platform API',
    services: {
      database: {
        engine: 'MongoDB',
        status: mongoStatus,
      },
      cache: {
        engine: 'Redis',
        status: redisInfo.connected ? 'Connected' : 'Fallback Active',
        mode: redisInfo.mode,
      },
    },
  });
});

// Mount Module Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/patents', patentRoutes);
app.use('/api/disclosures', disclosureRoutes);
app.use('/api/agreements', agreementRoutes);
app.use('/api/filings', filingRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/collaborations', collaborationRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/deadlines', deadlineRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/activity-logs', activityLogRoutes);

// 404 Route Catch-all
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: [${req.method}] ${req.originalUrl}`,
  });
});

// Global Centralized Error Middleware
app.use(errorHandler);

export default app;
