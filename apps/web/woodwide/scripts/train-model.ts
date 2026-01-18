/**
 * Quick Model Training Script
 * Generates synthetic human-like training data and trains a Woodwide anomaly model
 * 
 * Run with: npx tsx train-model.ts
 */

import { extractFeatures, featuresToCsv } from "../../server/lib/features";
import { WoodwideClient } from "../../server/services/woodwide";
import type { SessionTelemetry } from "@playproof/shared";
import { config } from "dotenv";
import { writeFileSync } from "fs";
import { join } from "path";

// Load environment variables
config({ path: "../../../../.env.local" });

const API_URL = process.env.WOODWIDE_BASE_URL || "https://api.woodwide.ai";
const API_KEY = process.env.WOODWIDE_API_KEY || "";

if (!API_KEY) {
  console.error("❌ WOODWIDE_API_KEY not found in .env.local");
  process.exit(1);
}

const woodwide = new WoodwideClient(API_KEY, API_URL);

/**
 * Generate realistic human-like movement data
 */
function generateHumanMovement(
  durationMs: number = 10000,
  startX: number = 100,
  startY: number = 100
): Array<{ x: number; y: number; timestamp: number }> {
  const movements: Array<{ x: number; y: number; timestamp: number }> = [];
  let x = startX;
  let y = startY;
  let timestamp = 0;

  // Simulate human-like movement with:
  // - Variable speed (not constant)
  // - Some jitter/micro-corrections
  // - Occasional pauses
  // - Curved paths (not perfectly straight)
  // - Natural acceleration/deceleration

  const targetX = startX + 200 + Math.random() * 300;
  const targetY = startY + 200 + Math.random() * 300;

  while (timestamp < durationMs) {
    // Calculate progress toward target
    const progress = Math.min(1, timestamp / durationMs);
    
    // Add natural curve (not straight line)
    const curve = Math.sin(progress * Math.PI * 2) * 30;
    
    // Variable speed (faster in middle, slower at start/end)
    const speedMultiplier = Math.sin(progress * Math.PI) * 0.5 + 0.5;
    
    // Add jitter (micro-corrections)
    const jitterX = (Math.random() - 0.5) * 5;
    const jitterY = (Math.random() - 0.5) * 5;

    x = startX + (targetX - startX) * progress + curve + jitterX;
    y = startY + (targetY - startY) * progress + jitterY;

    // Occasional pause (human hesitation)
    const pause = Math.random() < 0.03 ? 200 + Math.random() * 300 : 0;
    
    // Variable timing (not perfectly regular)
    const baseInterval = 16.67; // ~60fps
    const timingVariation = (Math.random() - 0.5) * 5;
    timestamp += baseInterval + timingVariation + pause;

    movements.push({ x, y, timestamp });
  }

  return movements;
}

/**
 * Generate a training session
 */
function generateTrainingSession(
  sessionId: string,
  gameType: "bubble-pop" | "archery" | "mini-golf" = "bubble-pop",
  deviceType: "mouse" | "touch" | "trackpad" = "mouse"
): SessionTelemetry {
  const durationMs = 5000 + Math.random() * 10000; // 5-15 seconds
  const movements = generateHumanMovement(durationMs);

  // Generate clicks with some misses
  const clicks = [];
  const numClicks = 3 + Math.floor(Math.random() * 7);
  let hits = 0;
  let misses = 0;

  for (let i = 0; i < numClicks; i++) {
    const clickTime = (durationMs / numClicks) * i + Math.random() * 500;
    const hit = Math.random() > 0.2; // 80% hit rate (realistic)
    
    if (hit) hits++;
    else misses++;

    clicks.push({
      x: 200 + Math.random() * 400,
      y: 200 + Math.random() * 400,
      timestamp: clickTime,
      targetHit: hit,
    });
  }

  return {
    sessionId,
    gameType,
    deviceType,
    durationMs,
    movements,
    clicks,
    hits,
    misses,
  };
}

/**
 * Generate training dataset
 */
async function generateTrainingDataset(numSessions: number = 1000) {
  console.log(`\n📊 Generating ${numSessions} training sessions...`);

  const sessions: SessionTelemetry[] = [];
  const gameTypes: Array<"bubble-pop" | "archery" | "mini-golf"> = [
    "bubble-pop",
    "archery",
    "mini-golf",
  ];
  const deviceTypes: Array<"mouse" | "touch" | "trackpad"> = [
    "mouse",
    "touch",
    "trackpad",
  ];

  for (let i = 0; i < numSessions; i++) {
    const gameType = gameTypes[Math.floor(Math.random() * gameTypes.length)];
    const deviceType = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];

    sessions.push(
      generateTrainingSession(`train_${i}`, gameType, deviceType)
    );

    if ((i + 1) % 100 === 0) {
      process.stdout.write(`   Generated ${i + 1}/${numSessions} sessions...\r`);
    }
  }

  console.log(`\n✅ Generated ${sessions.length} sessions`);

  // Extract features
  console.log("\n🔧 Extracting features...");
  const features = sessions.map((session) => extractFeatures(session));

  console.log(`✅ Extracted features for ${features.length} sessions`);

  // Convert to CSV
  console.log("\n📝 Converting to CSV format...");
  const csvRows = features.map((f) => {
    const row = featuresToCsv(f);
    return row.split("\n")[1]; // Get data row (skip header)
  });

  const headerRow = featuresToCsv(features[0]).split("\n")[0]; // Get header
  const csvData = [headerRow, ...csvRows].join("\n");

  console.log(`✅ CSV ready (${csvRows.length} rows)`);

  return csvData;
}

/**
 * Train the model
 */
async function trainModel() {
  console.log("🚀 Quick Model Training");
  console.log(`   Woodwide API: ${API_URL}`);
  console.log(`   API Key: ${API_KEY.substring(0, 10)}...`);

  try {
    // Step 1: Generate training data
    const csvData = await generateTrainingDataset(1000); // Start with 1000 sessions

    // Step 2: Save CSV locally (backup)
    const csvFilename = `movement_human_train_${Date.now()}.csv`;
    const csvPath = join(process.cwd(), csvFilename);
    writeFileSync(csvPath, csvData);
    console.log(`💾 CSV saved locally: ${csvFilename}`);

    // Step 2b: Upload dataset
    console.log("\n📤 Uploading dataset to Woodwide...");
    const datasetName = `movement_human_train_${Date.now()}`;
    
    let dataset;
    try {
      dataset = await woodwide.uploadDataset(datasetName, csvData, true);
      console.log(`✅ Dataset uploaded: ${dataset.datasetId}`);
      console.log(`   Rows: ${dataset.rowCount}, Columns: ${dataset.columns.length}`);
    } catch (error) {
      console.error("\n❌ Upload failed. You can upload manually:");
      console.error(`   1. Go to Woodwide dashboard`);
      console.error(`   2. Upload file: ${csvFilename}`);
      console.error(`   3. Then run training with dataset name`);
      throw error;
    }

    // Step 3: Train anomaly model
    console.log("\n🎓 Training anomaly model...");
    const modelName = "movement_anomaly_v1";
    const trainingResult = await woodwide.trainAnomalyModel({
      datasetName: dataset.datasetName,
      modelName,
      overwrite: true,
    });

    console.log(`✅ Training started!`);
    console.log(`   Model ID: ${trainingResult.modelId}`);
    console.log(`   Model Name: ${trainingResult.modelName}`);
    console.log(`   Status: ${trainingResult.status}`);

    // Step 4: Poll for completion
    console.log("\n⏳ Waiting for training to complete...");
    let status = trainingResult.status;
    let attempts = 0;
    const maxAttempts = 120; // 10 minutes max

    while (status !== "COMPLETE" && status !== "FAILED" && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds

      const modelStatus = await woodwide.getModelStatus(trainingResult.modelId);
      status = modelStatus.status;

      if (modelStatus.progress) {
        process.stdout.write(
          `   Status: ${status} (${(modelStatus.progress * 100).toFixed(1)}%)...\r`
        );
      } else {
        process.stdout.write(`   Status: ${status}...\r`);
      }

      attempts++;
    }

    console.log("\n");

    if (status === "COMPLETE") {
      console.log("🎉 Model training completed successfully!");
      console.log(`\n📋 Add this to your .env.local:`);
      console.log(`ANOMALY_MODEL_ID=${trainingResult.modelId}\n`);
    } else if (status === "FAILED") {
      const modelStatus = await woodwide.getModelStatus(trainingResult.modelId);
      console.error("❌ Training failed!");
      if (modelStatus.error) {
        console.error(`   Error: ${modelStatus.error}`);
      }
      process.exit(1);
    } else {
      console.warn("⚠️  Training still in progress. Check status later:");
      console.warn(`   curl http://localhost:3000/api/v1/training/${trainingResult.modelId}`);
    }
  } catch (error) {
    console.error("\n❌ Error:", error);
    if (error instanceof Error) {
      console.error(`   Message: ${error.message}`);
    }
    process.exit(1);
  }
}

trainModel();
