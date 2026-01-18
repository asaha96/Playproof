/**
 * Direct test of Woodwide API
 * Tests if we can upload a dataset and run inference
 */

import { WoodwideClient } from "./src/services/woodwide.js";
import { extractFeatures, featuresToCsv } from "./src/lib/features.js";
import type { SessionTelemetry } from "@playproof/shared";
import { config } from "dotenv";

config({ path: "../../.env.local" });

const API_KEY = process.env.WOODWIDE_API_KEY || "";
const BASE_URL = process.env.WOODWIDE_BASE_URL || "https://beta.woodwide.ai";
const MODEL_ID = process.env.ANOMALY_MODEL_ID || "";

if (!API_KEY || !MODEL_ID) {
  console.error("❌ Missing WOODWIDE_API_KEY or ANOMALY_MODEL_ID");
  process.exit(1);
}

async function testWoodwide() {
  console.log("🧪 Testing Woodwide API directly");
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   Model ID: ${MODEL_ID}`);
  console.log("");

  const client = new WoodwideClient(API_KEY, BASE_URL);

  // Step 1: Check model status
  console.log("1️⃣ Checking model status...");
  try {
    const status = await client.getModelStatus(MODEL_ID);
    console.log(`   Status: ${status.status}`);
    console.log(`   Name: ${status.modelName}`);
    if (status.error) {
      console.log(`   Error: ${status.error}`);
    }
  } catch (error) {
    console.error("   ❌ Failed to get model status:", error);
    return;
  }

  // Step 2: Create test session with realistic movement data
  console.log("\n2️⃣ Creating test session with realistic movements...");
  
  // Generate realistic human-like movement (similar to training data)
  const movements: Array<{ x: number; y: number; timestamp: number; isTrusted: boolean }> = [];
  let x = 100;
  let y = 100;
  let timestamp = 0;
  const durationMs = 10000;
  const targetX = 400;
  const targetY = 300;

  while (timestamp < durationMs) {
    const progress = Math.min(1, timestamp / durationMs);
    const curve = Math.sin(progress * Math.PI * 2) * 30;
    const jitterX = (Math.random() - 0.5) * 5;
    const jitterY = (Math.random() - 0.5) * 5;

    x = 100 + (targetX - 100) * progress + curve + jitterX;
    y = 100 + (targetY - 100) * progress + jitterY;

    const pause = Math.random() < 0.03 ? 200 + Math.random() * 300 : 0;
    const baseInterval = 16.67;
    const timingVariation = (Math.random() - 0.5) * 5;
    timestamp += baseInterval + timingVariation + pause;

    movements.push({ x, y, timestamp, isTrusted: true });
  }

  const testSession: SessionTelemetry = {
    sessionId: "test_woodwide_direct",
    gameType: "bubble-pop",
    deviceType: "mouse",
    durationMs,
    movements,
    clicks: [
      { x: 250, y: 200, timestamp: 2000, targetHit: true },
      { x: 350, y: 250, timestamp: 5000, targetHit: true },
      { x: 300, y: 220, timestamp: 8000, targetHit: false },
    ],
    hits: 2,
    misses: 1,
  };
  
  console.log(`   Generated ${movements.length} movement events`);

  // Step 3: Extract features
  console.log("3️⃣ Extracting features...");
  const features = extractFeatures(testSession);
  const csvData = featuresToCsv(features);
  console.log(`   Features extracted: ${Object.keys(features).length} fields`);

  // Step 4: Upload dataset
  console.log("\n4️⃣ Uploading dataset to Woodwide...");
  let datasetId: string;
  try {
    const dataset = await client.uploadDataset(
      `test_session_${Date.now()}`,
      csvData,
      true
    );
    datasetId = dataset.datasetId;
    console.log(`   ✅ Dataset uploaded: ${datasetId}`);
  } catch (error) {
    console.error("   ❌ Dataset upload failed:", error);
    if (error instanceof Error) {
      console.error("   Message:", error.message);
    }
    return;
  }

  // Step 5: Run inference
  console.log("\n5️⃣ Running inference...");
  try {
    const results = await client.inferAnomaly(MODEL_ID, datasetId, true);
    console.log(`   ✅ Inference successful!`);
    console.log(`   Results:`, results);
    
    if (results.length > 0) {
      const result = results[0];
      console.log(`\n📊 Anomaly Score: ${result.anomalyScore}`);
      console.log(`   Is Anomaly: ${result.isAnomaly}`);
      console.log(`   Session ID: ${result.sessionId}`);
    }
  } catch (error) {
    console.error("   ❌ Inference failed:", error);
    if (error instanceof Error) {
      console.error("   Message:", error.message);
      if (error.stack) {
        console.error("   Stack:", error.stack);
      }
    }
    return;
  }

  // Step 6: Test scoreSession convenience method
  console.log("\n6️⃣ Testing scoreSession convenience method...");
  try {
    const result = await client.scoreSession(MODEL_ID, "test_convenience", csvData);
    console.log(`   ✅ scoreSession worked!`);
    console.log(`   Anomaly Score: ${result.anomalyScore}`);
    console.log(`   Is Anomaly: ${result.isAnomaly}`);
  } catch (error) {
    console.error("   ❌ scoreSession failed:", error);
    if (error instanceof Error) {
      console.error("   Message:", error.message);
    }
  }

  console.log("\n✨ All tests complete!");
}

testWoodwide().catch(console.error);
