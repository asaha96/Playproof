import { jsonResponse, optionsResponse } from "@/server/http";
import { woodwideClient } from "@/server/services/woodwide-client";

export const runtime = "nodejs";

interface RouteParams {
  modelId: string;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<RouteParams> }
) {
  const methods = ["GET", "OPTIONS"];
  const { modelId } = await params;

  try {
    const status = await woodwideClient.getModelStatus(modelId);
    return jsonResponse(
      request,
      {
        modelId,
        status: status.status,
        progress: status.progress,
        error: status.error,
        createdAt: status.createdAt,
        completedAt: status.completedAt,
      },
      undefined,
      methods
    );
  } catch (error) {
    console.error("[API] Failed to get training status:", error);
    return jsonResponse(
      request,
      {
        error: "Failed to get training status",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
      methods
    );
  }
}

export function OPTIONS(request: Request) {
  return optionsResponse(request, ["GET", "OPTIONS"]);
}
