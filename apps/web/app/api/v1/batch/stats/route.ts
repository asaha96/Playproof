import { jsonResponse, optionsResponse } from "@/server/http";
import { batchScheduler } from "@/server/services/batch/scheduler";
import { getBatchStats } from "@/server/services/batch/inference";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const methods = ["GET", "OPTIONS"];
  const stats = getBatchStats();
  const schedulerStatus = batchScheduler.getStatus();

  return jsonResponse(
    request,
    {
      queue: stats,
      scheduler: {
        running: schedulerStatus.running,
        isProcessing: schedulerStatus.isProcessing,
        lastProcessed: schedulerStatus.lastProcessed
          ? new Date(schedulerStatus.lastProcessed).toISOString()
          : null,
      },
    },
    undefined,
    methods
  );
}

export function OPTIONS(request: Request) {
  return optionsResponse(request, ["GET", "OPTIONS"]);
}
