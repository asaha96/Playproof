import { jsonResponse, optionsResponse } from "@/server/http";
import { appConfig } from "@/server/config";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const methods = ["GET", "OPTIONS"];
  const checks = {
    woodwide: Boolean(appConfig.woodwide.apiKey),
  };
  const allReady = Object.values(checks).every(Boolean);

  return jsonResponse(
    request,
    {
      ready: allReady,
      checks,
    },
    undefined,
    methods
  );
}

export function OPTIONS(request: Request) {
  return optionsResponse(request, ["GET", "OPTIONS"]);
}
