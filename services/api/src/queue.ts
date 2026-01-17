// BullMQ Queue for attempt processing
import { Queue } from 'bullmq';

const connection = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379'),
};

export const attemptsQueue = new Queue('attempts', { connection });

export interface AttemptJob {
  attemptId: string;
  batchIndex: number;
  data: Uint8Array;
  hash: string;
  prevHash: string;
  receivedAt: number;
}

export async function enqueueAttemptBatch(job: AttemptJob): Promise<void> {
  await attemptsQueue.add('process-batch', job, {
    removeOnComplete: 100,
    removeOnFail: 50,
  });
}
