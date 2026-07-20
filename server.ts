import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

import authRoutes from './server/routes/authRoutes';
import aiRoutes from './server/routes/aiRoutes';
import reportRoutes from './server/routes/reportRoutes';
import scheduleRoutes from './server/routes/scheduleRoutes';
import rewardRoutes from './server/routes/rewardRoutes';
import userRoutes from './server/routes/userRoutes';
import docRoutes from './server/routes/docRoutes';
import monitoringRoutes from './server/routes/monitoringRoutes';

import { requestLogger } from './server/middlewares/requestLogger';
import { errorHandler } from './server/middlewares/errorHandler';
import { configureHelmet, configureCors, apiRateLimiter } from './server/middlewares/security';
import { Logger } from './server/utils/logger';

dotenv.config();

const app = express();
const PORT = 3000;

// Trust reverse proxy for rate limiting (needed in Cloud Run/Nginx environment)
app.set('trust proxy', 1);

// 1. Mount Security Headers and CORS
app.use(configureHelmet);
app.use(configureCors);

// 2. Support parsing large payloads and base64 images
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 3. Register Global HTTP Request Logger
app.use(requestLogger);

// 4. Mount Health and Monitoring (probes usually unauthenticated and outside /api)
app.use('/', monitoringRoutes);

// 5. Apply Global API Rate Limiter
app.use('/api', apiRateLimiter);

// 6. Mount Production-Grade Authentication & Authorization Routes
app.use('/api/auth', authRoutes);

// 7. Mount Core Municipal Application Service Routers
app.use('/api', reportRoutes);
app.use('/api', scheduleRoutes);
app.use('/api', rewardRoutes);
app.use('/api', userRoutes);
app.use('/api', aiRoutes);
app.use('/api', docRoutes);

// 8. Mount Centralized Global Error Handler (MUST be registered after routes)
app.use(errorHandler);

// Setup Vite Development Middleware or Production Static Assets Serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    Logger.info('Server', 'Vite development middleware loaded successfully');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    Logger.info('Server', 'Serving production static files from dist directory');
  }

  app.listen(PORT, '0.0.0.0', () => {
    Logger.info('Server', `EcoTrack full-stack server running successfully on http://0.0.0.0:${PORT}`);
  });
}

if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  startServer();
}

export { app };
