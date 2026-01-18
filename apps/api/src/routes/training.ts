/**
 * Training management routes
 * POST /api/v1/training/start - Start model training
 * GET /api/v1/training/:modelId - Get training status
 */

import type { FastifyInstance } from "fastify";
import { WoodwideClient } from "../services/woodwide.js";
import { appConfig } from "../config.js";

interface StartTrainingBody {
  datasetName: string;
  modelName: string;
  modelType?: "anomaly" | "prediction";
  labelColumn?: string;
  inputColumns?: string[];
  overwrite?: boolean;
}

interface TrainingStatusParams {
  modelId: string;
}

export async function trainingRoutes(fastify: FastifyInstance) {
  const woodwide = new WoodwideClient(
    appConfig.woodwide.apiKey,
    appConfig.woodwide.baseUrl
  );

  // Start training a new model
  fastify.post<{ Body: StartTrainingBody }>("/training/start", async (request, reply) => {
    try {
      const {
        datasetName,
        modelName,
        modelType = "anomaly",
        labelColumn,
        inputColumns,
        overwrite = false,
      } = request.body;

      if (!datasetName || !modelName) {
        return reply.status(400).send({
          error: "Missing required fields: datasetName and modelName are required",
        });
      }

      let result;
      if (modelType === "anomaly") {
        result = await woodwide.trainAnomalyModel({
          datasetName,
          modelName,
          inputColumns,
          overwrite,
        });
      } else {
        if (!labelColumn) {
          return reply.status(400).send({
            error: "labelColumn is required for prediction models",
          });
        }
        result = await woodwide.trainPredictionModel({
          datasetName,
          modelName,
          labelColumn,
          inputColumns,
          overwrite,
        });
      }

      return {
        success: true,
        modelId: result.modelId,
        modelName: result.modelName,
        status: result.status,
        message: "Training started successfully",
      };
    } catch (error) {
      fastify.log.error(error, "Training start failed");
      return reply.status(500).send({
        error: "Failed to start training",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Get training status
  fastify.get<{ Params: TrainingStatusParams }>("/training/:modelId", async (request, reply) => {
    try {
      const { modelId } = request.params;

      const status = await woodwide.getModelStatus(modelId);

      return {
        modelId,
        status: status.status,
        progress: status.progress,
        error: status.error,
        createdAt: status.createdAt,
        completedAt: status.completedAt,
      };
    } catch (error) {
      fastify.log.error(error, "Failed to get training status");
      return reply.status(500).send({
        error: "Failed to get training status",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Upload a dataset
  fastify.post<{ Body: { name: string; data: string; overwrite?: boolean } }>(
    "/datasets/upload",
    async (request, reply) => {
      try {
        const { name, data, overwrite = false } = request.body;

        if (!name || !data) {
          return reply.status(400).send({
            error: "Missing required fields: name and data are required",
          });
        }

        const result = await woodwide.uploadDataset(name, data, overwrite);

        return {
          success: true,
          datasetId: result.datasetId,
          datasetName: result.datasetName,
          rowCount: result.rowCount,
          columns: result.columns,
        };
      } catch (error) {
        fastify.log.error(error, "Dataset upload failed");
        return reply.status(500).send({
          error: "Failed to upload dataset",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );
}
