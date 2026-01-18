import { jsonResponse, optionsResponse } from "@/server/http";
import { sessionQueue } from "@/server/services/batch/queue";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const methods = ["POST", "OPTIONS"];
  sessionQueue.clear();
  return jsonResponse(
    request,
    {
      success: true,
      message: "Queue cleared",
    },
    undefined,
    methods
  );
}

export function OPTIONS(request: Request) {
  return optionsResponse(request, ["POST", "OPTIONS"]);
}
