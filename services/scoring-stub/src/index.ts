// PlayProof Scoring Stub - BullMQ Worker
import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { decode } from '@msgpack/msgpack';

interface AttemptJob {
  attemptId: string;
  batchIndex: number;
  data: Uint8Array;
  hash: string;
  prevHash: string;
  receivedAt: number;
}

interface BatchEvents {
  attemptId: string;
  batchIndex: number;
  events: Array<{
    type: string;
    timestamp: number;
    x?: number;
    y?: number;
    coalesced?: Array<{ x: number; y: number; timestamp: number }>;
  }>;
  startTime: number;
  endTime: number;
}

const redis = new Redis({
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379'),
  maxRetriesPerRequest: null,
});

const connection = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379'),
};

// Simple heuristic scoring
function computeScore(events: BatchEvents['events']): { score: number; result: 'pass' | 'fail' | 'regenerate' } {
  // Count pointer events
  const pointerEvents = events.filter(e => e.type.startsWith('pointer'));
  
  // Check for coalesced events (indicates real browser input)
  const hasCoalesced = pointerEvents.some(e => e.coalesced && e.coalesced.length > 0);
  
  // Calculate movement variance (human input has micro-jitter)
  let velocityVariance = 0;
  if (pointerEvents.length > 2) {
    const velocities: number[] = [];
    for (let i = 1; i < pointerEvents.length; i++) {
      const prev = pointerEvents[i - 1];
      const curr = pointerEvents[i];
      if (prev.x !== undefined && curr.x !== undefined && prev.y !== undefined && curr.y !== undefined) {
        const dt = curr.timestamp - prev.timestamp;
        if (dt > 0) {
          const dx = curr.x - prev.x;
          const dy = curr.y - prev.y;
          velocities.push(Math.sqrt(dx * dx + dy * dy) / dt);
        }
      }
    }
    
    if (velocities.length > 1) {
      const mean = velocities.reduce((a, b) => a + b, 0) / velocities.length;
      velocityVariance = velocities.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / velocities.length;
    }
  }

  // Score based on heuristics
  let score = 0;
  
  // Points for having enough events
  if (events.length >= 10) score += 30;
  if (events.length >= 50) score += 20;
  
  // Points for coalesced events
  if (hasCoalesced) score += 25;
  
  // Points for velocity variance (human jitter)
  if (velocityVariance > 0.01) score += 25;

  // Determine result
  if (score >= 70) {
    return { score, result: 'pass' };
  } else if (score >= 40) {
    return { score, result: 'regenerate' };
  } else {
    return { score, result: 'fail' };
  }
}

const worker = new Worker<AttemptJob>(
  'attempts',
  async (job: Job<AttemptJob>) => {
    const { attemptId, batchIndex, data } = job.data;
    
    console.log(`Processing attempt ${attemptId}, batch ${batchIndex}`);

    try {
      // Decode the msgpack data
      const batch = decode(data) as BatchEvents;
      
      // Compute heuristic score
      const { score, result } = computeScore(batch.events);
      
      console.log(`Attempt ${attemptId}: score=${score}, result=${result}`);

      // Store result in Redis
      // Only update if this is the final determination or upgrading from pending
      const existingResult = await redis.get(`result:${attemptId}`);
      const existing = existingResult ? JSON.parse(existingResult) : null;
      
      // Simple logic: later batches can update the result
      if (!existing || existing.result === 'pending') {
        await redis.set(
          `result:${attemptId}`,
          JSON.stringify({
            attemptId,
            result,
            score,
            processedAt: Date.now(),
          }),
          'EX',
          3600 // 1 hour TTL
        );
      }

      return { success: true, score, result };
    } catch (error) {
      console.error(`Error processing attempt ${attemptId}:`, error);
      
      // Mark as failed on error
      await redis.set(
        `result:${attemptId}`,
        JSON.stringify({
          attemptId,
          result: 'fail',
          reason: 'Processing error',
          processedAt: Date.now(),
        }),
        'EX',
        3600
      );

      throw error;
    }
  },
  { connection }
);

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});

console.log('PlayProof Scoring Stub worker started');

// Graceful shutdown
const shutdown = async () => {
  await worker.close();
  await redis.quit();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
