// Challenge issuance route
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { nanoid } from 'nanoid';
import { redis } from '../redis';

interface ChallengeResponse {
  attemptId: string;
  challengeToken: string;
  seed: number;
  rulesetId: string;
  ttl: number;
  ingestUrl: string;
}

interface AttemptState {
  attemptId: string;
  challengeToken: string;
  seed: number;
  rulesetId: string;
  createdAt: number;
  expiresAt: number;
  lastBatchIndex: number;
  lastHash: string;
}

const TTL_SECONDS = 60; // 1 minute challenge validity
const GENESIS_HASH = '0'.repeat(64);

export async function challengeRoutes(fastify: FastifyInstance) {
  fastify.post('/challenge', async (_request: FastifyRequest, reply: FastifyReply) => {
    const attemptId = nanoid(21);
    const challengeToken = nanoid(32);
    const seed = Math.floor(Math.random() * 0x7fffffff);
    const rulesetId = 'default-v1';
    const now = Date.now();

    const state: AttemptState = {
      attemptId,
      challengeToken,
      seed,
      rulesetId,
      createdAt: now,
      expiresAt: now + TTL_SECONDS * 1000,
      lastBatchIndex: -1,
      lastHash: GENESIS_HASH,
    };

    // Store attempt state in Redis
    await redis.set(
      `attempt:${attemptId}`,
      JSON.stringify(state),
      'EX',
      TTL_SECONDS + 30 // Extra buffer for processing
    );

    // Initialize result as pending
    await redis.set(
      `result:${attemptId}`,
      JSON.stringify({
        attemptId,
        result: 'pending',
        createdAt: now,
      }),
      'EX',
      3600 // 1 hour
    );

    const response: ChallengeResponse = {
      attemptId,
      challengeToken,
      seed,
      rulesetId,
      ttl: TTL_SECONDS,
      ingestUrl: `/v1/attempts/${attemptId}/batches`,
    };

    return reply.code(201).send(response);
  });
}

export type { AttemptState };
export { GENESIS_HASH };
