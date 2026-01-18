import { jsonResponse, optionsResponse } from "@/server/http";
import { getSessionResult } from "@/server/services/batch/inference";
import { sessionQueue } from "@/server/services/batch/queue";

export const runtime = "nodejs";

interface RouteParams {
  sessionId: string;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<RouteParams> }
) {
  const methods = ["GET", "OPTIONS"];
  const { sessionId } = await params;
  const result = getSessionResult(sessionId);

  if (!result) {
    if (sessionQueue.has(sessionId)) {
      return jsonResponse(
        request,
        {
          sessionId,
          status: "queued",
          message: "Session is queued but not yet processed",
        },
        undefined,
        methods
      );
    }

    return jsonResponse(
      request,
      {
        sessionId,
        status: "not_found",
        message: "Session not found in queue",
      },
      undefined,
      methods
    );
  }

  return jsonResponse(
    request,
    {
      sessionId,
      status: "processed",
      result,
    },
    undefined,
    methods
  );
}

export function OPTIONS(request: Request) {
  return optionsResponse(request, ["GET", "OPTIONS"]);
}
