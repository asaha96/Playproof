import { jsonResponse, optionsResponse } from "@/server/http";
import { appConfig } from "@/server/config";
import { observability } from "@/server/services/observability";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const methods = ["GET", "OPTIONS"];
  const metrics = observability.getMetrics();

  return jsonResponse(
    request,
    {
      ...metrics,
      successRate: observability.getSuccessRate(),
      timestamp: new Date().toISOString(),
      woodwideConfigured: Boolean(appConfig.woodwide.anomalyModelId),
      modelId: appConfig.woodwide.anomalyModelId || null,
    },
    undefined,
    methods
  );
}

export function OPTIONS(request: Request) {
  return optionsResponse(request, ["GET", "OPTIONS"]);
}
