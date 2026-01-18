/**
 * Batch Inference Service
 * =======================
 * Handles batch inference using Woodwide:
 * 1. Collects queued sessions
 * 2. Appends to persistent dataset
 * 3. Runs inference
 * 4. Maps results back to sessions
 */

import { WoodwideClient } from "@/server/services/woodwide";
import { sessionQueue, type QueuedSession } from "@/server/services/batch/queue";
import { featuresToCsv } from "@/server/lib/features";
import { appConfig } from "@/server/config";

const woodwideClient = new WoodwideClient(
  appConfig.woodwide.apiKey,
  appConfig.woodwide.baseUrl
);

const PERSISTENT_DATASET_NAME = appConfig.woodwide.persistentDatasetName;
const BATCH_SIZE = 50; // Process 50 sessions at a time

/**
 * Append sessions to persistent inference dataset
 */
async function appendToDataset(
  sessions: QueuedSession[]
): Promise<{ datasetId: string; datasetName: string; rowCount: number }> {
  if (sessions.length === 0) {
    throw new Error("No sessions to append");
  }

  // Build CSV with all sessions
  // Get headers from first session (excluding userId)
  const firstRow = featuresToCsv(sessions[0].features);
  const headerLine = firstRow.split("\n")[0];
  
  // Build data rows for all sessions
  const dataRows = sessions.map((s) => {
    const csv = featuresToCsv(s.features);
    return csv.split("\n")[1]; // Get data row (skip header)
  });

  const csvData = [headerLine, ...dataRows].join("\n");

  // Create a batch dataset with timestamp
  const batchDatasetName = `${PERSISTENT_DATASET_NAME}_batch_${Date.now()}`;
  const dataset = await woodwideClient.uploadDataset(batchDatasetName, csvData, true);

  return dataset;
}

/**
 * Process a batch of queued sessions
 */
export async function processBatch(): Promise<{
  processed: number;
  success: number;
  failed: number;
}> {
  if (!appConfig.woodwide.anomalyModelId) {
    throw new Error("Woodwide model ID not configured");
  }

  const batch = sessionQueue.getBatch(BATCH_SIZE);
  if (batch.length === 0) {
    return { processed: 0, success: 0, failed: 0 };
  }

  console.log(`[BatchInference] Processing batch of ${batch.length} sessions`);

  try {
    // Step 1: Append to dataset
    const dataset = await appendToDataset(batch);
    console.log(`[BatchInference] Dataset created: ${dataset.datasetName} (${dataset.rowCount} rows)`);

    // Step 2: Run inference
    // Wait longer for dataset processing (Woodwide may need time to process new datasets)
    console.log(`[BatchInference] Waiting for dataset processing...`);
    await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds

    const inferenceResults = await woodwideClient.inferAnomaly(
      appConfig.woodwide.anomalyModelId,
      dataset.datasetId,
      true,
      dataset.datasetName,
      batch.length // Provide row count for proper batch processing
    );

    console.log(`[BatchInference] Inference complete: ${inferenceResults.length} results`);

    // Step 3: Map results back to sessions
    // Woodwide's inferAnomaly returns InferenceResult[] but for batch, we need to check
    // if the response contains anomalous_ids array
    const resultMap = new Map<string, QueuedSession["result"]>();

    // Check if we got anomalous_ids format (single result with empty sessionId)
    if (inferenceResults.length === 1 && !inferenceResults[0].sessionId) {
      // This means we got the anomalous_ids format - but we need to check the raw response
      // For now, use the single result for all sessions (this is a limitation)
      // TODO: Parse anomalous_ids from raw response to map correctly
      const baseResult = inferenceResults[0];
      
      batch.forEach((session) => {
        resultMap.set(session.sessionId, {
          anomalyScore: baseResult.anomalyScore,
          isAnomaly: baseResult.isAnomaly,
          decision: baseResult.anomalyScore <= 1.0 ? "pass" : baseResult.anomalyScore <= 2.5 ? "review" : "fail",
        });
      });
    } else if (inferenceResults.length === batch.length) {
      // Handle per-row results format (one result per session)
      batch.forEach((session, index) => {
        if (index < inferenceResults.length) {
          const result = inferenceResults[index];
          resultMap.set(session.sessionId, {
            anomalyScore: result.anomalyScore,
            isAnomaly: result.isAnomaly,
            decision: result.anomalyScore <= 1.0 ? "pass" : result.anomalyScore <= 2.5 ? "review" : "fail",
          });
        }
      });
    } else {
      // Mismatch - log warning and use heuristic fallback for all
      console.warn(`[BatchInference] Result count mismatch: expected ${batch.length}, got ${inferenceResults.length}`);
      batch.forEach((session) => {
        // Use a neutral score - will be refined by heuristics
        resultMap.set(session.sessionId, {
          anomalyScore: 1.5,
          isAnomaly: false,
          decision: "review",
        });
      });
    }

    // Step 4: Mark sessions as processed
    sessionQueue.markProcessed(
      batch.map((s) => s.sessionId),
      resultMap
    );

    return {
      processed: batch.length,
      success: resultMap.size,
      failed: batch.length - resultMap.size,
    };
  } catch (error) {
    console.error("[BatchInference] Batch processing failed:", error);
    throw error;
  }
}

/**
 * Get batch processing stats
 */
export function getBatchStats() {
  return sessionQueue.getStats();
}

/**
 * Check if a session result is ready
 */
export function getSessionResult(sessionId: string): QueuedSession["result"] | null {
  return sessionQueue.getResult(sessionId);
}
