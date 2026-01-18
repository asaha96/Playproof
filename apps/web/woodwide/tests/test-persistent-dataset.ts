/**
 * Test Persistent Dataset Implementation
 */

import type { SessionTelemetry } from "@playproof/shared";
import { config } from "dotenv";
import { WoodwideClient } from "../../server/services/woodwide";
import { extractFeatures, featuresToCsv } from "../../server/lib/features";

config({ path: "../../../../.env.local" });

const API_KEY = process.env.WOODWIDE_API_KEY ?? "";
const BASE_URL = process.env.WOODWIDE_BASE_URL ?? "https://beta.woodwide.ai";
const MODEL_ID = process.env.ANOMALY_MODEL_ID ?? "";
const PERSISTENT_DATASET = process.env.WOODWIDE_PERSISTENT_DATASET ?? "movement_live_inference";

if (!API_KEY || !MODEL_ID) {
  console.error("❌ Missing WOODWIDE_API_KEY or ANOMALY_MODEL_ID");
  process.exit(1);
}

const woodwideClient = new WoodwideClient(API_KEY, BASE_URL);

async function testPersistentDataset() {
  console.log("🧪 Testing Persistent Dataset Implementation\n");

  // Create test telemetry
  const telemetry: SessionTelemetry = {
    sessionId: "test_persistent_direct",
    gameType: "bubble-pop",
    deviceType: "mouse",
    durationMs: 10000,
    movements: [
      { x: 100, y: 100, timestamp: 0, isTrusted: true },
      { x: 105, y: 103, timestamp: 16.67, isTrusted: true },
      { x: 110, y: 107, timestamp: 33.34, isTrusted: true },
      { x: 115, y: 112, timestamp: 50.01, isTrusted: true },
      { x: 120, y: 118, timestamp: 66.68, isTrusted: true },
    ],
    clicks: [{ x: 200, y: 200, timestamp: 2000, targetHit: true }],
    hits: 1,
    misses: 0,
  };

  const features = extractFeatures(telemetry);
  const csvData = featuresToCsv(features);

  console.log("1. Testing ensurePersistentDataset...");
  try {
    const dataset = await woodwideClient["ensurePersistentDataset"](
      PERSISTENT_DATASET,
      csvData
    );
    console.log(`   ✅ Dataset: ${dataset.datasetName} (${dataset.rowCount} rows, ID: ${dataset.datasetId})`);
  } catch (error) {
    console.error(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }

  console.log("\n2. Testing inference on existing training dataset...");
  try {
    // Test inference on the training dataset directly (which we know exists)
    const results = await woodwideClient["inferAnomaly"](
      MODEL_ID,
      "",
      true,
      "movement_human_train"
    );
    console.log(`   ✅ Inference successful: ${results.length} results`);
    if (results.length > 0) {
      console.log(`      - First result: score=${results[0].anomalyScore}, isAnomaly=${results[0].isAnomaly}`);
    }
  } catch (error) {
    console.error(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
  }

  console.log("\n3. Testing scoreSession with persistent dataset...");
  try {
    const result = await woodwideClient.scoreSession(
      MODEL_ID,
      telemetry.sessionId,
      csvData,
      PERSISTENT_DATASET
    );
    console.log(`   ✅ Result:`);
    console.log(`      - Anomaly Score: ${result.anomalyScore}`);
    console.log(`      - Is Anomaly: ${result.isAnomaly}`);
    console.log(`      - Session ID: ${result.sessionId}`);
  } catch (error) {
    console.error(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      console.error(`   Stack: ${error.stack}`);
    }
  }

  console.log("\n✨ Test complete!");
}

testPersistentDataset().catch(console.error);
