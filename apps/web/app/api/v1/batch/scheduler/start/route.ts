import { jsonResponse, optionsResponse } from "@/server/http";
import { batchScheduler } from "@/server/services/batch/scheduler";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const methods = ["POST", "OPTIONS"];
  batchScheduler.start();
  return jsonResponse(
    request,
    {
      success: true,
      message: "Batch scheduler started",
      status: batchScheduler.getStatus(),
    },
    undefined,
    methods
  );
}

export function OPTIONS(request: Request) {
  return optionsResponse(request, ["POST", "OPTIONS"]);
}
