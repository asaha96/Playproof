import { jsonResponse, optionsResponse } from "@/server/http";
import { processBatch } from "@/server/services/batch/inference";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const methods = ["POST", "OPTIONS"];
  try {
    const result = await processBatch();
    return jsonResponse(
      request,
      {
        ...result,
        message: `Processed ${result.processed} sessions`,
      },
      undefined,
      methods
    );
  } catch (error) {
    console.error("[API] Batch processing failed:", error);
    return jsonResponse(
      request,
      {
        error: "Batch processing failed",
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
