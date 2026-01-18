import { jsonResponse, optionsResponse } from "@/server/http";
import { woodwideClient } from "@/server/services/woodwide-client";

export const runtime = "nodejs";

interface StartTrainingBody {
  datasetName: string;
  modelName: string;
  modelType?: "anomaly" | "prediction";
  labelColumn?: string;
  inputColumns?: string[];
  overwrite?: boolean;
}

export async function POST(request: Request) {
  const methods = ["POST", "OPTIONS"];
  let body: StartTrainingBody;

  try {
    body = await request.json();
  } catch {
    return jsonResponse(request, { error: "Invalid JSON body" }, { status: 400 }, methods);
  }

  const { datasetName, modelName, modelType = "anomaly", labelColumn, inputColumns, overwrite = false } = body ?? {};

  if (!datasetName || !modelName) {
    return jsonResponse(
      request,
      { error: "Missing required fields: datasetName and modelName are required" },
      { status: 400 },
      methods
    );
  }

  try {
    if (modelType === "prediction" && !labelColumn) {
      return jsonResponse(
        request,
        { error: "labelColumn is required for prediction models" },
        { status: 400 },
        methods
      );
    }

    const result =
      modelType === "anomaly"
        ? await woodwideClient.trainAnomalyModel({ datasetName, modelName, inputColumns, overwrite })
        : await woodwideClient.trainPredictionModel({
            datasetName,
            modelName,
            labelColumn,
            inputColumns,
            overwrite,
          });

    return jsonResponse(
      request,
      {
        success: true,
        modelId: result.modelId,
        modelName: result.modelName,
        status: result.status,
        message: "Training started successfully",
      },
      undefined,
      methods
    );
  } catch (error) {
    console.error("[API] Training start failed:", error);
    return jsonResponse(
      request,
      {
        error: "Failed to start training",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
      methods
    );
  }
}

export function OPTIONS(request: Request) {
  return optionsResponse(request, ["POST", "OPTIONS"]);
}
