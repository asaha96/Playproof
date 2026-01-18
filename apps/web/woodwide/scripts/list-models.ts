#!/usr/bin/env tsx
/**
 * List Woodwide Models Script
 * Lists all available models and helps identify anomaly detection models
 */

import * as dotenv from "dotenv";
import { resolve } from "path";

// Load env.local from project root
dotenv.config({ path: resolve(__dirname, "../../../../env.local") });

const API_KEYS = (process.env.WOODWIDE_API_KEYS || process.env.WOODWIDE_API_KEY || "").split(",").map(k => k.trim()).filter(k => k);
const BASE_URL = process.env.WOODWIDE_BASE_URL || "https://beta.woodwide.ai";

if (API_KEYS.length === 0) {
  console.error("❌ WOODWIDE_API_KEY or WOODWIDE_API_KEYS not set in env.local");
  process.exit(1);
}

async function listModels(apiKey: string) {
  const url = `${BASE_URL}/api/models`;
  
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "accept": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const models = await response.json() as Array<{
      id: string;
      name: string;
      type: string;
      training_status: string;
    }>;

    return models;
  } catch (error) {
    console.error(`Error with API key ${apiKey.substring(0, 20)}...:`, error);
    throw error;
  }
}

async function main() {
  console.log("🔍 Listing Woodwide Models");
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   Using ${API_KEYS.length} API key(s)\n`);

  let allModels: Array<{
    id: string;
    name: string;
    type: string;
    training_status: string;
  }> = [];

  // Try each API key until one works
  for (let i = 0; i < API_KEYS.length; i++) {
    const apiKey = API_KEYS[i];
    console.log(`📡 Trying API key ${i + 1}/${API_KEYS.length}...`);
    
    try {
      const models = await listModels(apiKey);
      allModels = models;
      console.log(`✅ Successfully retrieved models using key ${i + 1}\n`);
      break;
    } catch (error) {
      if (i === API_KEYS.length - 1) {
        console.error(`❌ All API keys failed. Last error:`, error);
        process.exit(1);
      }
      console.log(`⚠️  Key ${i + 1} failed, trying next...\n`);
    }
  }

  if (allModels.length === 0) {
    console.log("📭 No models found");
    return;
  }

  console.log(`📊 Found ${allModels.length} model(s):\n`);

  // Group by type
  const anomalyModels = allModels.filter(m => m.type === "anomaly");
  const predictionModels = allModels.filter(m => m.type === "prediction");

  if (anomalyModels.length > 0) {
    console.log("🎯 Anomaly Detection Models:");
    anomalyModels.forEach((model) => {
      const statusEmoji = model.training_status === "COMPLETE" ? "✅" : 
                         model.training_status === "TRAINING" ? "⏳" : 
                         model.training_status === "FAILED" ? "❌" : "⚠️";
      console.log(`   ${statusEmoji} ${model.name}`);
      console.log(`      ID: ${model.id}`);
      console.log(`      Status: ${model.training_status}`);
      console.log("");
    });
  }

  if (predictionModels.length > 0) {
    console.log("🔮 Prediction Models:");
    predictionModels.forEach((model) => {
      const statusEmoji = model.training_status === "COMPLETE" ? "✅" : 
                         model.training_status === "TRAINING" ? "⏳" : 
                         model.training_status === "FAILED" ? "❌" : "⚠️";
      console.log(`   ${statusEmoji} ${model.name}`);
      console.log(`      ID: ${model.id}`);
      console.log(`      Status: ${model.training_status}`);
      console.log("");
    });
  }

  // Suggest the first complete anomaly model
  const completeAnomalyModel = anomalyModels.find(m => m.training_status === "COMPLETE");
  if (completeAnomalyModel) {
    console.log("💡 Suggested Model ID (copy to env.local):");
    console.log(`   ANOMALY_MODEL_ID=${completeAnomalyModel.id}\n`);
  } else if (anomalyModels.length > 0) {
    console.log("⚠️  No completed anomaly models found. You may need to train one first.\n");
    console.log("💡 To train a new model, use:");
    console.log("   npm run train:anomaly\n");
  } else {
    console.log("⚠️  No anomaly models found. You need to train one first.\n");
    console.log("💡 To train a new model, use:");
    console.log("   npm run train:anomaly\n");
  }
}

main().catch(console.error);
