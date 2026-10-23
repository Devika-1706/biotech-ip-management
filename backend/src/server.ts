import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { connectDatabase } from './config/database';
import { initRedis } from './config/redis';

const PORT = parseInt(process.env.PORT || '5000', 10);

const startServer = async () => {
  try {
    console.log('------------------------------------------------------------');
    console.log('Starting Biotechnology IP Lifecycle & Compliance Platform...');
    console.log('------------------------------------------------------------');

    // Connect MongoDB
    await connectDatabase();

    // Initialize Redis Caching (with automatic graceful fallback)
    await initRedis();

    const server = app.listen(PORT, () => {
      console.log(`[BioVault API] Server listening on http://localhost:${PORT}`);
      console.log(`[BioVault API] Health check at http://localhost:${PORT}/api/health`);
    });

    // Graceful shutdown handling
    const handleShutdown = () => {
      console.log('\n[BioVault API] Received shutdown signal. Closing server...');
      server.close(() => {
        console.log('[BioVault API] Server closed cleanly.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', handleShutdown);
    process.on('SIGINT', handleShutdown);
  } catch (error) {
    console.error('Fatal startup error:', error);
    process.exit(1);
  }
};

startServer();
