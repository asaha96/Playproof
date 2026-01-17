// PlayProof API - Entry Point
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { challengeRoutes } from './routes/challenge';
import { batchRoutes } from './routes/batch';
import { resultRoutes } from './routes/result';
import { redis } from './redis';

const fastify = Fastify({
  logger: true,
});

async function start() {
  // Register CORS
  await fastify.register(cors, {
    origin: true,
  });

  // Register routes
  await fastify.register(challengeRoutes, { prefix: '/v1' });
  await fastify.register(batchRoutes, { prefix: '/v1' });
  await fastify.register(resultRoutes, { prefix: '/v1' });

  // Health check
  fastify.get('/health', async () => ({ status: 'ok' }));

  // Graceful shutdown
  const shutdown = async () => {
    await fastify.close();
    await redis.quit();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  try {
    await fastify.listen({ port: 3001, host: '0.0.0.0' });
    console.log('PlayProof API running on http://localhost:3001');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
