// Result polling route
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { redis } from '../redis';

interface AttemptResult {
  attemptId: string;
  result: 'pending' | 'pass' | 'fail' | 'regenerate';
  score?: number;
  reason?: string;
  processedAt?: number;
}

export async function resultRoutes(fastify: FastifyInstance) {
  fastify.get<{
    Params: { attemptId: string };
  }>(
    '/attempts/:attemptId/result',
    async (request: FastifyRequest<{ Params: { attemptId: string } }>, reply: FastifyReply) => {
      const { attemptId } = request.params;

      // Get result from Redis
      const resultJson = await redis.get(`result:${attemptId}`);
      
      if (!resultJson) {
        return reply.code(404).send({ error: 'Attempt not found' });
      }

      const result: AttemptResult = JSON.parse(resultJson);
      
      return reply.send(result);
    }
  );
}
