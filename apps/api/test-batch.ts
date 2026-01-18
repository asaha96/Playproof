/**
 * Test Batch Inference System
 */

import { sessionQueue } from "./src/services/batch/queue.js";
import { processBatch, getBatchStats } from "./src/services/batch/inference.js";
import { extractFeatures } from "./src/lib/features.js";
import type { SessionTelemetry } from "@playproof/shared";

// Generate test sessions
function generateTestSessions(count: number): SessionTelemetry[] {
  const sessions: SessionTelemetry[] = [];

  for (let i = 0; i < count; i++) {
    const movements: Array<{ x: number; y: number; timestamp: number; isTrusted: boolean }> = [];
    let timestamp = 0;

    // Generate human-like movement pattern
    for (let j = 0; j < 50; j++) {
      const x = 100 + Math.random() * 200 + Math.sin(j * 0.1) * 10;
      const y = 100 + Math.random() * 200 + Math.cos(j * 0.1) * 10;
      timestamp += 16.67 + Math.random() * 10; // ~60fps with variation
      movements.push({ x, y, timestamp, isTrusted: true });
    }

    sessions.push({
      sessionId: `test_batch_${i}`,
      gameType: "bubble-pop",
      deviceType: "mouse",
      durationMs: timestamp,
      movements,
      clicks: [],
      hits: 0,
      misses: 0,
    });
  }

  return sessions;
}

async function main() {
  console.log("🧪 Testing Batch Inference System\n");

  // Step 1: Generate and queue test sessions
  console.log("1. Generating and queuing test sessions...");
  const testSessions = generateTestSessions(50); // Queue 50 sessions for better Woodwide compatibility

  for (const session of testSessions) {
    const features = extractFeatures(session);
    sessionQueue.enqueue(session.sessionId, session, features);
  }

  const stats = getBatchStats();
  console.log(`   ✅ Queued ${stats.unprocessed} sessions\n`);

  // Step 2: Process batch
  console.log("2. Processing batch...");
  try {
    const result = await processBatch();
    console.log(`   ✅ Processed: ${result.processed}`);
    console.log(`   ✅ Success: ${result.success}`);
    console.log(`   ✅ Failed: ${result.failed}\n`);
  } catch (error) {
    console.error(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}\n`);
  }

  // Step 3: Check results
  console.log("3. Checking results...");
  for (const session of testSessions.slice(0, 5)) {
    const result = sessionQueue.getResult(session.sessionId);
    if (result) {
      console.log(`   Session ${session.sessionId}: ${result.decision} (score: ${result.anomalyScore.toFixed(2)})`);
    } else {
      console.log(`   Session ${session.sessionId}: not processed yet`);
    }
  }

  console.log("\n✨ Test complete!");
}

main().catch(console.error);
