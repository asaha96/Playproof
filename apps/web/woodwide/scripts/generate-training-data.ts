/**
 * Generate Training Data
 * Creates a CSV file with synthetic human-like movement data
 * 
 * Run with: npx tsx generate-training-data.ts
 * 
 * Then upload the CSV to Woodwide dashboard and train manually,
 * or use the Python SDK if available.
 */

import { extractFeatures, featuresToCsv } from "../../server/lib/features";
import type { SessionTelemetry } from "@playproof/shared";
import { writeFileSync } from "fs";
import { join } from "path";

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

  const targetX = startX + 200 + Math.random() * 300;
  const targetY = startY + 200 + Math.random() * 300;

  while (timestamp < durationMs) {
    const progress = Math.min(1, timestamp / durationMs);
    const curve = Math.sin(progress * Math.PI * 2) * 30;
    const speedMultiplier = Math.sin(progress * Math.PI) * 0.5 + 0.5;
    const jitterX = (Math.random() - 0.5) * 5;
    const jitterY = (Math.random() - 0.5) * 5;

    x = startX + (targetX - startX) * progress + curve + jitterX;
    y = startY + (targetY - startY) * progress + jitterY;

    const pause = Math.random() < 0.03 ? 200 + Math.random() * 300 : 0;
    const baseInterval = 16.67;
    const timingVariation = (Math.random() - 0.5) * 5;
    timestamp += baseInterval + timingVariation + pause;

    movements.push({ x, y, timestamp });
  }

  return movements;
}

function generateTrainingSession(
  sessionId: string,
  gameType: "bubble-pop" | "archery" | "mini-golf" = "bubble-pop",
  deviceType: "mouse" | "touch" | "trackpad" = "mouse"
): SessionTelemetry {
  const durationMs = 5000 + Math.random() * 10000;
  const movements = generateHumanMovement(durationMs);

  const clicks = [];
  const numClicks = 3 + Math.floor(Math.random() * 7);
  let hits = 0;
  let misses = 0;

  for (let i = 0; i < numClicks; i++) {
    const clickTime = (durationMs / numClicks) * i + Math.random() * 500;
    const hit = Math.random() > 0.2;
    
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

async function main() {
  const numSessions = parseInt(process.argv[2] || "1000", 10);
  
  console.log(`🚀 Generating ${numSessions} training sessions...\n`);

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

  console.log("\n🔧 Extracting features...");
  const features = sessions.map((session) => extractFeatures(session));
  console.log(`✅ Extracted features for ${features.length} sessions`);

  console.log("\n📝 Converting to CSV format...");
  const csvRows = features.map((f) => {
    const row = featuresToCsv(f);
    return row.split("\n")[1];
  });

  const headerRow = featuresToCsv(features[0]).split("\n")[0];
  const csvData = [headerRow, ...csvRows].join("\n");

  const timestamp = Date.now();
  const filename = `movement_human_train_${timestamp}.csv`;
  const filepath = join(process.cwd(), filename);

  writeFileSync(filepath, csvData);

  console.log(`\n✅ CSV saved: ${filename}`);
  console.log(`   Location: ${filepath}`);
  console.log(`   Rows: ${csvRows.length + 1} (including header)`);
  console.log(`   Size: ${(csvData.length / 1024).toFixed(1)} KB`);

  console.log("\n📋 Next steps:");
  console.log("   1. Upload this CSV to Woodwide dashboard");
  console.log("   2. Or use the Python SDK:");
  console.log(`      python -c "from woodwide import WoodWide; import pandas as pd; client = WoodWide(api_key='YOUR_KEY'); df = pd.read_csv('${filename}'); client.api.datasets.upload(file=df, name='movement_human_train')"`);
  console.log("   3. Train the model:");
  console.log(`      curl -X POST http://localhost:3000/api/v1/training/start \\`);
  console.log(`        -H "Content-Type: application/json" \\`);
  console.log(`        -d '{"datasetName": "movement_human_train", "modelName": "movement_anomaly_v1", "modelType": "anomaly"}'`);
  console.log("\n✨ Done!");
}

main().catch(console.error);
