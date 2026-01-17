import Fastify, { FastifyInstance } from 'fastify';

const fastify: FastifyInstance = Fastify({ logger: true });

fastify.get('/health', async () => {
  return { status: 'ok', service: 'playproof-api' };
});

// Placeholder routes - implement later
// fastify.post('/issue', async (request, reply) => { ... });
// fastify.post('/events', async (request, reply) => { ... });
// fastify.post('/finalize', async (request, reply) => { ... });

const start = async (): Promise<void> => {
  try {
    await fastify.listen({ port: 3001, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
