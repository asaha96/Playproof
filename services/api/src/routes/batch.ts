// Batch ingestion route with hash-chain validation
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { decode } from '@msgpack/msgpack';
import { redis } from '../redis';
import { enqueueAttemptBatch } from '../queue';
import { AttemptState, GENESIS_HASH } from './challenge';

interface SignedBatchEnvelope {
  data: Uint8Array;
  hash: string;
  prevHash: string;
}

interface BatchContent {
  attemptId: string;
  batchIndex: number;
  events: unknown[];
  startTime: number;
  endTime: number;
}

// Simple hash verification (must match SDK implementation)
function computeHash(prevHash: string, data: Uint8Array): string {
  const bytesToHex = (bytes: Uint8Array): string => {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const input = prevHash + bytesToHex(data);
  
  let hash = 0x811c9dc5;
  const prime = 0x01000193;
  
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, prime);
  }
  
  const h1 = (hash >>> 0).toString(16).padStart(8, '0');
  let h = hash;
  const segments = [h1];
  for (let i = 0; i < 7; i++) {
    h = Math.imul(h ^ (h >>> 16), prime);
    segments.push((h >>> 0).toString(16).padStart(8, '0'));
  }
  
  return segments.join('');
}

export async function batchRoutes(fastify: FastifyInstance) {
  // Register content type parser for msgpack
  fastify.addContentTypeParser(
    'application/msgpack',
    { parseAs: 'buffer' },
    (_req, body, done) => {
      done(null, body);
    }
  );

  fastify.post<{
    Params: { attemptId: string };
  }>(
    '/attempts/:attemptId/batches',
    async (request: FastifyRequest<{ Params: { attemptId: string } }>, reply: FastifyReply) => {
      const { attemptId } = request.params;
      const challengeToken = request.headers['x-challenge-token'] as string;

      if (!challengeToken) {
        return reply.code(401).send({ error: 'Missing challenge token' });
      }

      // Get attempt state from Redis
      const stateJson = await redis.get(`attempt:${attemptId}`);
      if (!stateJson) {
        return reply.code(404).send({ error: 'Attempt not found or expired' });
      }

      const state: AttemptState = JSON.parse(stateJson);

      // Validate token
      if (state.challengeToken !== challengeToken) {
        return reply.code(401).send({ error: 'Invalid challenge token' });
      }

      // Check TTL
      if (Date.now() > state.expiresAt) {
        return reply.code(410).send({ error: 'Challenge expired' });
      }

      // Decode msgpack envelope
      let envelope: SignedBatchEnvelope;
      try {
        envelope = decode(request.body as Buffer) as SignedBatchEnvelope;
      } catch (error) {
        return reply.code(400).send({ error: 'Invalid msgpack format' });
      }

      // Decode batch content
      let batchContent: BatchContent;
      try {
        batchContent = decode(envelope.data) as BatchContent;
      } catch (error) {
        return reply.code(400).send({ error: 'Invalid batch content' });
      }

      // Validate batch index continuity
      const expectedBatchIndex = state.lastBatchIndex + 1;
      if (batchContent.batchIndex !== expectedBatchIndex) {
        return reply.code(409).send({
          error: 'Batch index out of order',
          expected: expectedBatchIndex,
          received: batchContent.batchIndex,
        });
      }

      // Validate hash chain
      const expectedPrevHash = state.lastBatchIndex === -1 ? GENESIS_HASH : state.lastHash;
      if (envelope.prevHash !== expectedPrevHash) {
        return reply.code(409).send({
          error: 'Hash chain broken - invalid prevHash',
          expected: expectedPrevHash,
          received: envelope.prevHash,
        });
      }

      // Verify the hash computation
      const computedHash = computeHash(envelope.prevHash, envelope.data);
      if (computedHash !== envelope.hash) {
        return reply.code(400).send({
          error: 'Hash verification failed',
          expected: computedHash,
          received: envelope.hash,
        });
      }

      // Update attempt state
      state.lastBatchIndex = batchContent.batchIndex;
      state.lastHash = envelope.hash;
      await redis.set(
        `attempt:${attemptId}`,
        JSON.stringify(state),
        'EX',
        Math.ceil((state.expiresAt - Date.now()) / 1000) + 30
      );

      // Enqueue for processing
      await enqueueAttemptBatch({
        attemptId,
        batchIndex: batchContent.batchIndex,
        data: envelope.data,
        hash: envelope.hash,
        prevHash: envelope.prevHash,
        receivedAt: Date.now(),
      });

      return reply.code(202).send({
        accepted: true,
        batchIndex: batchContent.batchIndex,
      });
    }
  );
}
