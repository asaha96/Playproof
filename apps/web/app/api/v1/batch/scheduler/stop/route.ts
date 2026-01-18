import { jsonResponse, optionsResponse } from "@/server/http";
import { batchScheduler } from "@/server/services/batch/scheduler";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const methods = ["POST", "OPTIONS"];
  batchScheduler.stop();
  return jsonResponse(
    request,
    {
      success: true,
      message: "Batch scheduler stopped",
    },
    undefined,
    methods
  );
}

export function OPTIONS(request: Request) {
  return optionsResponse(request, ["POST", "OPTIONS"]);
}
