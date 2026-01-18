import { jsonResponse, optionsResponse } from "@/server/http";
import { batchScheduler } from "@/server/services/batch/scheduler";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const methods = ["GET", "OPTIONS"];
  return jsonResponse(request, batchScheduler.getStatus(), undefined, methods);
}

export function OPTIONS(request: Request) {
  return optionsResponse(request, ["GET", "OPTIONS"]);
}
