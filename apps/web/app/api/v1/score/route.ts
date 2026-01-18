import type { SessionTelemetry, ScoringResponse } from "@playproof/shared";
import { jsonResponse, optionsResponse } from "@/server/http";
import { scoreSession } from "@/server/services/scoring";

export const runtime = "nodejs";

interface ScoreRequestBody {
  sessionId: string;
  gameType: "bubble-pop" | "osu" | "snake";
  deviceType?: "mouse" | "touch" | "trackpad";
  durationMs?: number;
  movements: Array<{ x: number; y: number; timestamp: number }>;
  clicks?: Array<{ x: number; y: number; timestamp: number; targetHit: boolean }>;
  hits?: number;
  misses?: number;
  userId?: string;
  deploymentId?: string;
  useBatch?: boolean;
}

export async function POST(request: Request) {
  const startTime = performance.now();
  const methods = ["POST", "OPTIONS"];

  let body: ScoreRequestBody;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      request,
      { error: "Invalid JSON body" },
      { status: 400 },
      methods
    );
  }

  if (!body?.sessionId || !Array.isArray(body.movements) || body.movements.length === 0) {
    return jsonResponse(
      request,
      { error: "Missing required fields: sessionId and movements are required" },
      { status: 400 },
      methods
    );
  }

  try {
    const telemetry: SessionTelemetry = {
      sessionId: body.sessionId,
      userId: body.userId,
      deploymentId: body.deploymentId,
      gameType: body.gameType ?? "unknown",
      deviceType: body.deviceType ?? "unknown",
      durationMs: body.durationMs ?? 0,
      movements: body.movements.map((movement) => ({
        x: movement.x,
        y: movement.y,
        timestamp: movement.timestamp,
        isTrusted: true,
      })),
      clicks:
        body.clicks?.map((click) => ({
          x: click.x,
          y: click.y,
          timestamp: click.timestamp,
          targetHit: click.targetHit,
        })) ?? [],
      hits: body.hits ?? 0,
      misses: body.misses ?? 0,
    };

    const result = await scoreSession(telemetry, body.useBatch ? { useBatch: true } : undefined);
    const latencyMs = performance.now() - startTime;

    const response: ScoringResponse = {
      ...result,
      latencyMs,
    };

    return jsonResponse(request, response, undefined, methods);
  } catch (error) {
    console.error("[API] Scoring failed:", error);
    return jsonResponse(
      request,
      {
        error: "Scoring failed",
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
