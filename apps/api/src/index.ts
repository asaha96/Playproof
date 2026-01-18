/**
 * PlayProof API Server
 * Main entry point
 */

import dotenv from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Load env from multiple locations (local first, then root)
const __dirname = fileURLToPath(new URL('.', import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') }); // apps/api/.env
dotenv.config({ path: resolve(__dirname, '../../../.env.local') }); // root .env.local

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { pcgRoutes } from './routes/pcg.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function start(): Promise<void> {
  const fastify = Fastify({
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname'
        }
      }
    }
  });

  // Register CORS
  await fastify.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'OPTIONS']
  });

  // Register routes
  await fastify.register(pcgRoutes);

  // Root health check
  fastify.get('/', async () => ({
    name: '@playproof/api',
    version: '0.1.0',
    status: 'running'
  }));

  try {
    await fastify.listen({ port: PORT, host: HOST });
    console.log(`\n  PlayProof API running at http://${HOST}:${PORT}\n`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
