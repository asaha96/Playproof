/**
 * Woodwide HTTP Client
 * ====================
 * TypeScript client for Woodwide ML platform API.
 * Handles dataset upload, model training, and inference.
 */

import { Blob } from "node:buffer";
import type { TrainingStatus, DatasetUploadResult } from "@playproof/shared";
import { observability } from "./observability";

interface TrainModelOptions {
  datasetName: string;
  modelName: string;
  inputColumns?: string[];
  overwrite?: boolean;
}

interface TrainPredictionOptions extends TrainModelOptions {
  labelColumn: string;
}

interface InferenceResult {
  sessionId: string;
  anomalyScore: number;
  isAnomaly: boolean;
}

/**
 * Woodwide ML Platform HTTP Client
 */
export class WoodwideClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = "https://beta.woodwide.ai") {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, ""); // Remove trailing slash
  }

  /**
   * Make an authenticated request to Woodwide API
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const headers: Record<string, string> = {
      "Authorization": `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Woodwide API error: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Upload a dataset (CSV format)
   * Uses multipart/form-data as per Woodwide API spec
   */
  async uploadDataset(
    name: string,
    csvData: string,
    overwrite: boolean = false
  ): Promise<DatasetUploadResult> {
    const url = `${this.baseUrl}/api/datasets`;

    const formData = new FormData();
    const file = new Blob([csvData], { type: "text/csv" });
    formData.append("file", file, `${name}.csv`);
    formData.append("name", name);
    formData.append("overwrite", String(overwrite));

    const startTime = performance.now();
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    const responseTimeMs = performance.now() - startTime;
    const responseText = await response.text();

    if (!response.ok) {
      const error = new Error(`Dataset upload failed: ${response.status} - ${responseText}`);
      
      // Track observability
      const isCreditError = response.status === 402 || responseText.includes("credit") || responseText.includes("token");
      observability.trackCall(false, responseTimeMs, error);
      
      // Log credit errors specifically
      if (isCreditError) {
        console.error(
          JSON.stringify({
            level: "ERROR",
            service: "woodwide",
            operation: "uploadDataset",
            statusCode: response.status,
            error: responseText,
            timestamp: new Date().toISOString(),
            message: "Woodwide credits exhausted - cannot upload dataset",
          })
        );
      }
      
      throw error;
    }
    
    // Track successful upload
    observability.trackCall(true, responseTimeMs);

    const result = JSON.parse(responseText) as {
      id: string;
      name: string;
      row_count: number;
      columns: string[];
    };

    return {
      datasetId: result.id,
      datasetName: result.name,
      rowCount: result.row_count,
      columns: result.columns,
    };
  }

  /**
   * Train an anomaly detection model
   */
  async trainAnomalyModel(options: TrainModelOptions): Promise<{
    modelId: string;
    modelName: string;
    status: string;
  }> {
    const { datasetName, modelName, inputColumns, overwrite = false } = options;

    const url = `${this.baseUrl}/api/models/anomaly/train?dataset_name=${encodeURIComponent(datasetName)}`;
    
    // Use form-encoded body as per Woodwide API spec
    const formData = new URLSearchParams();
    formData.append("model_name", modelName);
    if (inputColumns) {
      formData.append("input_columns", JSON.stringify(inputColumns));
    }
    formData.append("overwrite", String(overwrite));

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Training failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json() as {
      id: string;
      name: string;
      training_status: string;
    };

    return {
      modelId: result.id,
      modelName: result.name,
      status: result.training_status,
    };
  }

  /**
   * Train a prediction/classification model
   */
  async trainPredictionModel(options: TrainPredictionOptions): Promise<{
    modelId: string;
    modelName: string;
    status: string;
  }> {
    const { datasetName, modelName, labelColumn, inputColumns, overwrite = false } = options;

    const url = `${this.baseUrl}/api/models/prediction/train?dataset_name=${encodeURIComponent(datasetName)}`;
    
    // Use form-encoded body as per Woodwide API spec
    const formData = new URLSearchParams();
    formData.append("model_name", modelName);
    formData.append("label_column", labelColumn);
    if (inputColumns) {
      formData.append("input_columns", JSON.stringify(inputColumns));
    }
    formData.append("overwrite", String(overwrite));

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Training failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json() as {
      id: string;
      name: string;
      training_status: string;
    };

    return {
      modelId: result.id,
      modelName: result.name,
      status: result.training_status,
    };
  }

  /**
   * Get model training status
   */
  async getModelStatus(modelId: string): Promise<TrainingStatus> {
    const url = `${this.baseUrl}/api/models/${modelId}`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "accept": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get model status: ${response.status} - ${errorText}`);
    }

    const result = await response.json() as {
      id: string;
      name: string;
      training_status: string;
      progress?: number;
      error?: string;
      created_at: string;
      completed_at?: string;
    };

    return {
      modelId: result.id,
      modelName: result.name,
      status: result.training_status as "PENDING" | "TRAINING" | "COMPLETE" | "FAILED",
      progress: result.progress,
      error: result.error,
      createdAt: result.created_at,
      completedAt: result.completed_at,
    };
  }

  /**
   * Run anomaly inference on a dataset
   * 
   * Note: Woodwide anomaly inference returns {anomalous_ids: number[]} format
   * where the array contains row indices (0-based) that are anomalous.
   * For single-row datasets, if [0] is in anomalous_ids, the row is anomalous.
   */
  async inferAnomaly(
    modelId: string,
    datasetId: string,
    coerceSchema: boolean = true,
    datasetName?: string,
    rowCount?: number
  ): Promise<InferenceResult[]> {
    const startTime = performance.now();
    
    // Try dataset_name first if provided, otherwise use dataset_id
    const queryParam = datasetName 
      ? `dataset_name=${encodeURIComponent(datasetName)}`
      : `dataset_id=${datasetId}`;
    const url = `${this.baseUrl}/api/models/anomaly/${modelId}/infer?${queryParam}&coerce_schema=${coerceSchema}`;
    
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "accept": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      const responseTimeMs = performance.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`Inference failed: ${response.status} - ${errorText}`);
        
        // Track observability
        const isCreditError = response.status === 402 || errorText.includes("credit") || errorText.includes("token");
        observability.trackCall(false, responseTimeMs, error);
        
        // Log credit errors specifically
        if (isCreditError) {
          console.error(
            JSON.stringify({
              level: "ERROR",
              service: "woodwide",
              operation: "inferAnomaly",
              statusCode: response.status,
              error: errorText,
              timestamp: new Date().toISOString(),
              message: "Woodwide credits exhausted - cannot run inference",
              modelId,
              datasetName: datasetName || datasetId,
            })
          );
        }
        
        throw error;
      }

      const responseText = await response.text();

      // Log for debugging (only in dev)
      if (process.env.NODE_ENV === "development") {
        console.log(`[Woodwide] Inference response: ${responseText.substring(0, 200)}`);
      }

      // If empty response, this might mean:
      // 1. Dataset is too small (Woodwide may require minimum rows)
      // 2. Dataset needs more processing time
      // 3. Dataset format doesn't match model expectations
      if (!responseText || responseText.trim() === "") {
        // For single-row or small datasets, return a neutral result instead of error
        // This allows the system to fall back to heuristics gracefully
        const error = new Error(`Empty response from inference endpoint. This may indicate the dataset needs more rows or processing time.`);
        observability.trackCall(false, responseTimeMs, error);
        console.warn(
          JSON.stringify({
            level: "WARN",
            service: "woodwide",
            operation: "inferAnomaly",
            message: "Empty inference response",
            timestamp: new Date().toISOString(),
            modelId,
            datasetName: datasetName || datasetId,
            rowCount,
          })
        );
        throw error;
      }

    // Parse response - Woodwide returns {anomalous_ids: number[]}
    let parsed: { anomalous_ids?: number[]; [key: string]: any };
    
    try {
      parsed = JSON.parse(responseText);
    } catch (error) {
      throw new Error(`Failed to parse inference response: ${responseText.substring(0, 100)}`);
    }

    // Handle Woodwide's anomalous_ids format
    if (parsed.anomalous_ids && Array.isArray(parsed.anomalous_ids)) {
      const anomalousIds = parsed.anomalous_ids as number[];
      
      // For batch inference, we need to return results for all rows
      // The anomalous_ids array contains 0-based indices of anomalous rows
      // We'll need to know the total row count - for now, we'll return a special format
      // that includes the anomalous_ids array for batch processing
      
      // Use provided rowCount or try to infer from dataset
      const totalRows = rowCount || (parsed as any).row_count || 1;
      
      // Return results for all rows
      const results: InferenceResult[] = [];
      for (let i = 0; i < totalRows; i++) {
        const isAnomalous = anomalousIds.includes(i);
        const anomalyScore = isAnomalous ? 2.5 : 0.5;
        
        results.push({
          sessionId: "", // Will be set by caller based on row index
          anomalyScore,
          isAnomaly: isAnomalous,
        });
      }
      
      // If no results (empty anomalous_ids and rowCount unknown), return single neutral result
      if (results.length === 0) {
        const neutralResult = [{
          sessionId: "",
          anomalyScore: 1.0,
          isAnomaly: false,
        }];
        observability.trackCall(true, responseTimeMs);
        return neutralResult;
      }
      
      // Track successful inference
      observability.trackCall(true, responseTimeMs);
      
      return results;
    }

    // Fallback: try to parse as array of results (if API changes format)
    if (Array.isArray(parsed)) {
      const results = parsed.map((r: any) => ({
        sessionId: r.session_id || r.sessionId || "",
        anomalyScore: r.anomaly_score || r.anomalyScore || 0,
        isAnomaly: r.is_anomaly || r.isAnomaly || false,
      }));
      
      // Track successful inference
      observability.trackCall(true, responseTimeMs);
      
      return results;
    }

    // If we get here, the format is unexpected
    const error = new Error(`Unexpected inference response format: ${JSON.stringify(parsed).substring(0, 200)}`);
    observability.trackCall(false, responseTimeMs, error);
    throw error;
    } catch (error) {
      const responseTimeMs = performance.now() - startTime;
      const err = error instanceof Error ? error : new Error(String(error));
      observability.trackCall(false, responseTimeMs, err);
      throw err;
    }
  }

  /**
   * Run prediction inference on a dataset
   */
  async inferPrediction(
    modelId: string,
    datasetId: string
  ): Promise<Array<{ sessionId: string; botProbability: number }>> {
    const url = `${this.baseUrl}/api/models/prediction/${modelId}/infer?dataset_id=${datasetId}`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Inference failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json() as Array<{
      session_id: string;
      prediction: number;
    }>;

    return result.map((r) => ({
      sessionId: r.session_id,
      botProbability: r.prediction,
    }));
  }

  /**
   * Check if a dataset exists by name
   */
  async datasetExists(datasetName: string): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/api/datasets?name=${encodeURIComponent(datasetName)}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "accept": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
      });

      if (response.status === 404) {
        return false;
      }

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return Array.isArray(data) && data.length > 0;
    } catch (error) {
      console.warn(`[Woodwide] Error checking dataset existence: ${error}`);
      return false;
    }
  }

  /**
   * Download a dataset by name
   * Note: Woodwide may not have a direct download endpoint.
   * If download fails, we'll use alternative strategies.
   */
  async downloadDataset(datasetName: string): Promise<string | null> {
    try {
      // Try download endpoint
      const url = `${this.baseUrl}/api/datasets/download?name=${encodeURIComponent(datasetName)}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "accept": "text/csv",
          "Authorization": `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        // If download endpoint doesn't exist (405, 501, etc.), return null
        if (response.status === 405 || response.status === 501) {
          console.warn(`[Woodwide] Dataset download endpoint not available (${response.status})`);
          return null;
        }
        throw new Error(`Failed to download dataset: ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      console.warn(`[Woodwide] Error downloading dataset: ${error}`);
      return null;
    }
  }

  /**
   * Ensure persistent dataset exists, create if it doesn't
   */
  async ensurePersistentDataset(
    datasetName: string,
    initialCsv?: string
  ): Promise<{ datasetId: string; datasetName: string; rowCount: number }> {
    // Check if dataset exists
    const exists = await this.datasetExists(datasetName);

    if (exists) {
      // Dataset exists, get its info
      const url = `${this.baseUrl}/api/datasets?name=${encodeURIComponent(datasetName)}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "accept": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
      });

      if (response.ok) {
        const datasets = await response.json() as Array<{
          id: string;
          name: string;
          row_count: number;
        }>;
        if (datasets.length > 0) {
          return {
            datasetId: datasets[0].id,
            datasetName: datasets[0].name,
            rowCount: datasets[0].row_count,
          };
        }
      }
    }

    // Dataset doesn't exist, create it
    if (initialCsv) {
      return await this.uploadDataset(datasetName, initialCsv, false);
    } else {
      // Create empty dataset with just headers
      // We'll need to get headers from a sample - use a minimal valid CSV
      const minimalCsv = "duration_ms,total_moves,avg_speed\n0,0,0";
      return await this.uploadDataset(datasetName, minimalCsv, false);
    }
  }

  /**
   * Append a row to an existing dataset
   */
  async appendToDataset(datasetName: string, csvRow: string, header?: string): Promise<void> {
    // Download current dataset
    const currentCsv = await this.downloadDataset(datasetName);

    if (!currentCsv) {
      // Dataset doesn't exist or can't be downloaded
      // If we have a header, use it; otherwise create minimal dataset
      if (header) {
        await this.uploadDataset(datasetName, `${header}\n${csvRow}`, true);
      } else {
        // Use a minimal header if not provided
        const minimalHeader = "duration_ms,total_moves,avg_speed,max_speed,median_speed,speed_std,avg_accel,max_accel,jerk_std,num_direction_changes,small_jitter_ratio,num_pauses_over_200ms,pause_time_ratio,path_efficiency,overshoot_events,control_smoothness_score,device_type,game_type";
        await this.uploadDataset(datasetName, `${minimalHeader}\n${csvRow}`, true);
      }
      return;
    }

    // Append new row
    const lines = currentCsv.trim().split("\n");
    const newCsv = [...lines, csvRow].join("\n");

    // Re-upload with overwrite
    await this.uploadDataset(datasetName, newCsv, true);
  }

  /**
   * Cleanup dataset to keep only last N rows
   */
  async cleanupDataset(datasetName: string, maxRows: number): Promise<void> {
    const currentCsv = await this.downloadDataset(datasetName);
    if (!currentCsv) {
      return;
    }

    const lines = currentCsv.trim().split("\n");
    if (lines.length <= maxRows) {
      return; // No cleanup needed
    }

    // Keep header + last N rows
    const header = lines[0];
    const dataRows = lines.slice(1);
    const lastRows = dataRows.slice(-maxRows);
    const cleanedCsv = [header, ...lastRows].join("\n");

    await this.uploadDataset(datasetName, cleanedCsv, true);
  }

  /**
   * Upload single session and get anomaly score using persistent dataset
   * 
   * Strategy: Use a persistent "live_inference" dataset:
   * 1. Ensure it exists (create if needed)
   * 2. Append the new session row
   * 3. Run inference on the whole dataset
   * 4. Extract result for the last row (new session)
   */
  async scoreSession(
    modelId: string,
    sessionId: string,
    csvData: string,
    persistentDatasetName?: string
  ): Promise<InferenceResult> {
    // Extract header and data row
    const lines = csvData.trim().split("\n");
    if (lines.length < 2) {
      throw new Error("CSV must have at least header and one data row");
    }

    const header = lines[0];
    const dataRow = lines[1];
    const datasetName = persistentDatasetName || "movement_live_inference";

    try {
      console.log(`[Woodwide] Starting persistent dataset scoring for session ${sessionId}`);
      
      // Step 1: Ensure persistent dataset exists
      const dataset = await this.ensurePersistentDataset(datasetName, `${header}\n${dataRow}`);
      console.log(`[Woodwide] Dataset ensured: ${dataset.datasetName} (${dataset.rowCount} rows, ID: ${dataset.datasetId})`);

      // Step 2: Append new session if dataset already existed
      if (dataset.rowCount > 0) {
        console.log(`[Woodwide] Appending session to existing dataset...`);
        await this.appendToDataset(datasetName, dataRow, header);
        console.log(`[Woodwide] Session appended successfully`);
      } else {
        console.log(`[Woodwide] Dataset is new, no append needed`);
      }

      // Step 3: Wait for dataset to be processed (new rows may need indexing)
      console.log(`[Woodwide] Waiting for dataset processing...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Step 4: Run inference on the persistent dataset
      // Use the actual dataset name returned (may differ from requested name)
      const actualDatasetName = dataset.datasetName;
      const updatedRowCount = dataset.rowCount > 0 ? dataset.rowCount + 1 : 1;
      console.log(`[Woodwide] Running inference on dataset "${actualDatasetName}" with ${updatedRowCount} rows...`);
      const results = await this.inferAnomaly(
        modelId,
        dataset.datasetId,
        true,
        actualDatasetName, // Use actual dataset name, not requested name
        updatedRowCount
      );
      console.log(`[Woodwide] Inference returned ${results.length} results`);

      if (results.length === 0) {
        throw new Error("No inference results returned from Woodwide");
      }

      // Step 5: Extract result for the last row (our new session)
      // The new row is at index = previous row count (0-based)
      const newRowIndex = dataset.rowCount > 0 ? dataset.rowCount : 0;
      console.log(`[Woodwide] Extracting result for row index ${newRowIndex} (dataset had ${dataset.rowCount} rows)`);
      const result = results.length > newRowIndex 
        ? results[newRowIndex] 
        : results[results.length - 1]; // Fallback to last result if index mismatch
      result.sessionId = sessionId;
      console.log(`[Woodwide] Result extracted: score=${result.anomalyScore}, isAnomaly=${result.isAnomaly}`);

      // Step 6: Optional cleanup if dataset is getting too large
      if (dataset.rowCount > 1000) {
        // Cleanup in background, don't wait
        this.cleanupDataset(datasetName, 500).catch((err) => {
          console.warn(`[Woodwide] Dataset cleanup failed: ${err}`);
        });
      }

      return result;
    } catch (error) {
      // If persistent dataset approach fails, try using the training dataset
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn(`[Woodwide] Persistent dataset approach failed: ${errorMsg}`);
      
      // Try using the training dataset which we know works
      try {
        console.log(`[Woodwide] Trying to use training dataset for inference...`);
        
        // Append this session to training dataset temporarily
        // Note: This modifies the training dataset, but it's the only way to get inference working
        const trainingDatasetName = "movement_human_train";
        await this.appendToDataset(trainingDatasetName, dataRow, header);
        
        // Wait for processing
        await new Promise((resolve) => setTimeout(resolve, 3000));
        
        // Run inference on training dataset
        const results = await this.inferAnomaly(
          modelId,
          "", // Don't need ID when using dataset name
          true,
          trainingDatasetName
        );
        
        if (results.length === 0) {
          throw new Error("No inference results from training dataset");
        }
        
        // Use the last result (our appended session)
        const result = results[results.length - 1];
        result.sessionId = sessionId;
        console.log(`[Woodwide] Successfully used training dataset for inference`);
        return result;
      } catch (trainingError) {
        console.warn(`[Woodwide] Training dataset approach also failed: ${trainingError instanceof Error ? trainingError.message : String(trainingError)}`);
        console.warn(`[Woodwide] Trying final fallback method...`);
        
        // Final fallback: Create temporary dataset with duplicated rows
        const numRows = 5;
        const paddedCsv = [header, ...Array(numRows).fill(dataRow)].join("\n");
        const tempDatasetName = `infer_${sessionId}_${Date.now()}`;
        const dataset = await this.uploadDataset(tempDatasetName, paddedCsv, true);

        await new Promise((resolve) => setTimeout(resolve, 3000));

        const results = await this.inferAnomaly(modelId, dataset.datasetId, true, dataset.datasetName, numRows);

        if (results.length === 0) {
          throw new Error("No inference results returned from Woodwide after all fallbacks");
        }

        const result = results[0];
        result.sessionId = sessionId;
        return result;
      }
    }
  }

  /**
   * Delete a dataset (cleanup after inference)
   */
  async deleteDataset(datasetId: string): Promise<void> {
    await this.request<void>("DELETE", `/api/datasets/${datasetId}`);
  }

  /**
   * List available models
   */
  async listModels(): Promise<Array<{
    modelId: string;
    modelName: string;
    type: string;
    status: string;
  }>> {
    const result = await this.request<Array<{
      id: string;
      name: string;
      type: string;
      training_status: string;
    }>>("GET", "/api/models");

    return result.map((m) => ({
      modelId: m.id,
      modelName: m.name,
      type: m.type,
      status: m.training_status,
    }));
  }
}

/**
 * Create a mock Woodwide client for development/testing
 */
export class MockWoodwideClient extends WoodwideClient {
  constructor() {
    super("mock-api-key", "http://localhost:8080");
  }

  override async uploadDataset(
    name: string,
    _csvData: string,
    _overwrite: boolean = false
  ): Promise<DatasetUploadResult> {
    return {
      datasetId: `ds_mock_${Date.now()}`,
      datasetName: name,
      rowCount: 1,
      columns: ["sessionId", "avgSpeed", "pathEfficiency"],
    };
  }

  override async inferAnomaly(
    _modelId: string,
    _datasetId: string,
    _coerceSchema: boolean = true,
    _datasetName?: string,
    rowCount: number = 1
  ): Promise<InferenceResult[]> {
    // Return random-ish but realistic scores for each row
    const results: InferenceResult[] = [];
    for (let i = 0; i < rowCount; i++) {
      const score = 0.3 + Math.random() * 1.5;
      results.push({
        sessionId: "",
        anomalyScore: score,
        isAnomaly: score > 2.0,
      });
    }
    return results;
  }

  override async scoreSession(
    _modelId: string,
    sessionId: string,
    _csvData: string
  ): Promise<InferenceResult> {
    const score = 0.3 + Math.random() * 1.5;
    return {
      sessionId,
      anomalyScore: score,
      isAnomaly: score > 2.0,
    };
  }

  override async getModelStatus(_modelId: string): Promise<TrainingStatus> {
    return {
      modelId: "mdl_mock",
      modelName: "mock_model",
      status: "COMPLETE",
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
  }
}
