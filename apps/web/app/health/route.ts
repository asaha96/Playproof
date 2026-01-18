import { jsonResponse, optionsResponse } from "@/server/http";
import { appConfig } from "@/server/config";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const methods = ["GET", "OPTIONS"];
  return jsonResponse(
    request,
    {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: appConfig.environment,
      woodwideConfigured: Boolean(appConfig.woodwide.apiKey),
    },
    undefined,
    methods
  );
}

export function OPTIONS(request: Request) {
  return optionsResponse(request, ["GET", "OPTIONS"]);
}
