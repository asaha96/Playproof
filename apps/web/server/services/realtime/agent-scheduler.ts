/**
 * Agent Scheduler Service
 * ========================
 * Invokes LLM every 3 seconds to evaluate windowed scores
 * and decide when to end the session as human or bot.
 */

import { TelemetryProcessor, type SessionState } from "./telemetry-processor";
import type { WindowScore } from "./windowed-scorer";
import { agentConfig } from "./config";
import OpenAI from "openai";

/**
 * Agent decision types
 */
export type AgentDecision = "human" | "bot";

/**
 * Summary of windowed scores for agent context
 */
export interface ScoreSummary {
  avgAnomalyScore: number;
  passCount: number;
  reviewCount: number;
  failCount: number;
  trend: "improving" | "degrading" | "stable";
  totalWindows: number;
  latestScore: number | null;
}

/**
 * Agent input passed to LLM
 */
export interface AgentInput {
  attemptId: string;
  elapsedMs: number;
  windowScores: Array<{
    windowId: number;
    decision: string;
    confidence: number;
    anomalyScore: number;
  }>;
  summary: ScoreSummary;
}

/**
 * Agent tool call result
 */
export interface AgentToolResult {
  decision: AgentDecision;
  reason: string;
}

/**
 * Control message sent to SDK
 */
export interface SessionEndMessage {
  type: "session_end";
  decision: AgentDecision;
  confidence: number;
  reason: string;
  timestamp: number;
}

let openaiClient: OpenAI | null = null;
const noToolLogState = new Map<string, { lastAt: number; lastPreview: string }>();
const logThrottleMs = 5000;

function normalizeAzureEndpoint(endpoint: string): string {
  const trimmed = endpoint.replace(/\/+$/, "");
  if (trimmed.endsWith("/openai/v1")) {
    return trimmed;
  }
  return `${trimmed}/openai/v1`;
}

function getOpenAIClient(): OpenAI | null {
  const { apiKey, endpoint } = agentConfig.llm;
  if (!apiKey || !endpoint) return null;

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey,
      baseURL: normalizeAzureEndpoint(endpoint),
      defaultHeaders: {
        "api-key": apiKey,
      },
    });
  }

  return openaiClient;
}

/**
 * Calculate score summary from window scores
 */
function calculateSummary(scores: WindowScore[]): ScoreSummary {
  if (scores.length === 0) {
    return {
      avgAnomalyScore: 0,
      passCount: 0,
      reviewCount: 0,
      failCount: 0,
      trend: "stable",
      totalWindows: 0,
      latestScore: null,
    };
  }

  const passCount = scores.filter((s) => s.decision === "pass").length;
  const reviewCount = scores.filter((s) => s.decision === "review").length;
  const failCount = scores.filter((s) => s.decision === "fail").length;

  const avgAnomalyScore =
    scores.reduce((sum, s) => sum + s.anomalyScore, 0) / scores.length;

  // Calculate trend from last 4 windows
  let trend: "improving" | "degrading" | "stable" = "stable";
  if (scores.length >= 4) {
    const recent = scores.slice(-4);
    const firstHalf = (recent[0].anomalyScore + recent[1].anomalyScore) / 2;
    const secondHalf = (recent[2].anomalyScore + recent[3].anomalyScore) / 2;
    const diff = secondHalf - firstHalf;

    if (diff < -0.3) {
      trend = "improving";
    } else if (diff > 0.3) {
      trend = "degrading";
    }
  }

  return {
    avgAnomalyScore,
    passCount,
    reviewCount,
    failCount,
    trend,
    totalWindows: scores.length,
    latestScore: scores[scores.length - 1].anomalyScore,
  };
}

/**
 * Build the agent system prompt
 */
function buildSystemPrompt(): string {
  return `You are an AI agent that determines whether a user interacting with a verification game is a human or a bot.

You receive windowed scoring data from pointer/mouse telemetry analysis. Each window represents ~0.5 seconds of movement data.

Scoring thresholds:
- anomalyScore <= ${agentConfig.thresholdPass}: PASS (likely human behavior)
- anomalyScore > ${agentConfig.thresholdPass} and <= ${agentConfig.thresholdReview}: REVIEW (uncertain)
- anomalyScore > ${agentConfig.thresholdReview}: FAIL (likely bot behavior)

Your task:
1. Analyze the windowed scores and their trend
2. Decide when you have enough confidence to make a determination
3. Call the endSession tool when ready, or wait for more data

Guidelines:
- Wait for at least ${agentConfig.minWindowsForDecision} windows before making a decision
- Consistent low scores (mostly pass) with natural variance → human
- Consistent high scores (mostly fail) or suspicious patterns → bot
- If scores are mixed (review), gather more data unless time is running out
- Sessions timeout at ${agentConfig.maxSessionMs / 1000} seconds, so decide before then
- Prefer accuracy over speed, but don't wait unnecessarily when the signal is clear
- If there is a sustained review streak, it is likely a bot

Do NOT make a decision unless you are confident. If uncertain, respond without calling the tool.`;
}

/**
 * Build the user message with current session data
 */
function buildUserMessage(input: AgentInput): string {
  const { attemptId, elapsedMs, windowScores, summary } = input;

  const windowsTable = windowScores
    .slice(-10) // Show last 10 windows
    .map(
      (w) =>
        `  Window ${w.windowId}: decision=${w.decision}, confidence=${w.confidence.toFixed(2)}, anomalyScore=${w.anomalyScore.toFixed(2)}`
    )
    .join("\n");

  return `Attempt: ${attemptId}
Elapsed: ${(elapsedMs / 1000).toFixed(1)}s / ${agentConfig.maxSessionMs / 1000}s max
Total windows: ${summary.totalWindows}

Summary:
- Average anomaly score: ${summary.avgAnomalyScore.toFixed(2)}
- Pass windows: ${summary.passCount}
- Review windows: ${summary.reviewCount}
- Fail windows: ${summary.failCount}
- Recent trend: ${summary.trend}
- Latest score: ${summary.latestScore?.toFixed(2) ?? "N/A"}

Recent windows:
${windowsTable}

Based on this data, should you end the session now? If yes, call the endSession tool with your decision (human or bot) and reasoning.`;
}

/**
 * Call Azure OpenAI with function calling
 */
async function callLLM(input: AgentInput): Promise<AgentToolResult | null> {
  const client = getOpenAIClient();
  if (!client) {
    console.warn("[AgentScheduler] Azure OpenAI not configured, using heuristic fallback");
    return heuristicDecision(input);
  }

  const systemPrompt = buildSystemPrompt();
  const userMessage = buildUserMessage(input);
  let useMaxCompletionTokens = false;
  const maxTokens = 500;

  const tools = [
    {
      type: "function" as const,
      function: {
        name: "endSession",
        description: "End the verification session with a final human/bot determination",
        parameters: {
          type: "object",
          properties: {
            decision: {
              type: "string",
              enum: ["human", "bot"],
              description: "Final determination: human or bot",
            },
            reason: {
              type: "string",
              description: "Brief explanation for the decision",
            },
          },
          required: ["decision", "reason"],
        },
      },
    },
  ];

  for (let attempt = 0; attempt < agentConfig.llmRetryAttempts; attempt++) {
    try {
      const completion = await client.chat.completions.create({
        model: agentConfig.llm.deploymentName,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        tools,
        tool_choice: "auto",
      });

      const message = completion.choices?.[0]?.message;

      if (!message) {
        throw new Error("No message in response");
      }

      if (message.tool_calls?.length) {
        console.log("[AgentScheduler] LLM tool call received", {
          toolName: message.tool_calls[0]?.function?.name,
        });
      } else if (message.content) {
        const preview = message.content.slice(0, 200);
        const now = Date.now();
        const last = noToolLogState.get(input.attemptId);
        if (!last || last.lastPreview !== preview || now - last.lastAt > logThrottleMs) {
          console.log("[AgentScheduler] LLM response without tool call", {
            contentPreview: preview,
          });
          noToolLogState.set(input.attemptId, { lastAt: now, lastPreview: preview });
        }
      } else {
        const now = Date.now();
        const last = noToolLogState.get(input.attemptId);
        if (!last || now - last.lastAt > logThrottleMs) {
          console.log("[AgentScheduler] LLM response without tool call or content");
          noToolLogState.set(input.attemptId, { lastAt: now, lastPreview: "" });
        }
      }

      // Check for tool call
      const toolCall = message.tool_calls?.[0];
      if (toolCall?.function?.name === "endSession") {
        const args = JSON.parse(toolCall.function.arguments ?? "{}");
        if (args.decision !== "human" && args.decision !== "bot") {
          throw new Error(`Invalid tool decision: ${args.decision}`);
        }
        return {
          decision: args.decision as AgentDecision,
          reason: typeof args.reason === "string" ? args.reason : "No reason provided",
        };
      }

      // No tool call - agent is waiting for more data
      return null;

    } catch (error) {
      const param =
        typeof error === "object" && error !== null && "error" in error
          ? (error as { error?: { param?: string } }).error?.param
          : undefined;
      if (param === "max_tokens") {
        useMaxCompletionTokens = true;
        console.warn(
          "[AgentScheduler] max_tokens unsupported, retrying with max_completion_tokens"
        );
      } else if (param === "max_completion_tokens") {
        useMaxCompletionTokens = false;
        console.warn(
          "[AgentScheduler] max_completion_tokens unsupported, retrying with max_tokens"
        );
      }

      console.warn(
        `[AgentScheduler] LLM call failed (attempt ${attempt + 1}/${agentConfig.llmRetryAttempts}):`,
        error
      );

      if (attempt < agentConfig.llmRetryAttempts - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, agentConfig.llmRetryDelayMs * (attempt + 1))
        );
      }
    }
  }

  // All retries failed - use heuristic fallback
  console.warn("[AgentScheduler] LLM calls exhausted, using heuristic fallback");
  return heuristicDecision(input);
}

/**
 * Heuristic-based decision when LLM is unavailable
 */
function heuristicDecision(input: AgentInput): AgentToolResult | null {
  const { summary, elapsedMs, windowScores } = input;

  // Not enough data
  if (summary.totalWindows < agentConfig.minWindowsForDecision) {
    return null;
  }

  // Calculate ratios
  const total = summary.passCount + summary.reviewCount + summary.failCount;
  const passRatio = summary.passCount / total;
  const failRatio = summary.failCount / total;

  // Clear human signal
  if (passRatio >= 0.75 && summary.avgAnomalyScore < agentConfig.thresholdPass + 0.3) {
    return {
      decision: "human",
      reason: `High pass ratio (${(passRatio * 100).toFixed(0)}%) with low average anomaly score (${summary.avgAnomalyScore.toFixed(2)})`,
    };
  }

  // Clear bot signal
  if (failRatio >= 0.5 || summary.avgAnomalyScore > agentConfig.thresholdReview + 0.5) {
    return {
      decision: "bot",
      reason: `High fail ratio (${(failRatio * 100).toFixed(0)}%) or elevated average anomaly score (${summary.avgAnomalyScore.toFixed(2)})`,
    };
  }

  // Persistent review streak indicates likely bot behavior
  let reviewStreak = 0;
  for (let i = windowScores.length - 1; i >= 0; i -= 1) {
    if (windowScores[i].decision !== "review") break;
    reviewStreak += 1;
  }
  if (reviewStreak >= 10) {
    return {
      decision: "bot",
      reason: `Sustained review streak (${reviewStreak} windows) with no clear human signal`,
    };
  }

  // Force decision near timeout
  const timeoutThreshold = agentConfig.maxSessionMs * 0.85;
  if (elapsedMs >= timeoutThreshold) {
    const decision: AgentDecision = summary.avgAnomalyScore <= agentConfig.thresholdReview ? "human" : "bot";
    return {
      decision,
      reason: `Near timeout (${(elapsedMs / 1000).toFixed(1)}s), deciding based on average score (${summary.avgAnomalyScore.toFixed(2)})`,
    };
  }

  // Wait for more data
  return null;
}

/**
 * Agent Scheduler
 * Manages periodic LLM invocation and session control
 */
export class AgentScheduler {
  private processor: TelemetryProcessor;
  private invokeInterval: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private decisionMade = false;
  private isInvoking = false;
  private onDecision?: (result: AgentToolResult, sessionState: SessionState) => void;
  private attemptId: string;
  private lastWaitLogMs = 0;
  private lastWaitWindowCount = 0;
  private lastNoDecisionLogMs = 0;

  constructor(
    processor: TelemetryProcessor,
    attemptId: string,
    config?: {
      onDecision?: (result: AgentToolResult, sessionState: SessionState) => void;
    }
  ) {
    this.processor = processor;
    this.attemptId = attemptId;
    this.onDecision = config?.onDecision;
  }

  /**
   * Start the agent scheduler
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.decisionMade = false;
    console.log(`[AgentScheduler] Started for attempt ${this.attemptId}`);

    // Invoke agent at configured interval
    this.invokeInterval = setInterval(() => {
      this.invokeAgent();
    }, agentConfig.agentInvokeIntervalMs);
  }

  /**
   * Invoke the agent with current session data
   */
  private async invokeAgent(): Promise<void> {
    if (!this.isRunning || this.decisionMade || this.isInvoking) return;

    const sessionState = this.processor.getSessionState();
    if (!sessionState || !sessionState.isActive) {
      this.stop();
      return;
    }

    const windowScores = this.processor.getWindowScores();
    const elapsedMs = this.processor.getElapsedMs();

    // Check if we have enough windows
    if (windowScores.length < agentConfig.minWindowsForDecision) {
      const now = Date.now();
      if (
        windowScores.length !== this.lastWaitWindowCount ||
        now - this.lastWaitLogMs > logThrottleMs
      ) {
        console.log(
          `[AgentScheduler] Waiting for more windows (${windowScores.length}/${agentConfig.minWindowsForDecision})`
        );
        this.lastWaitLogMs = now;
        this.lastWaitWindowCount = windowScores.length;
      }
      return;
    }

    // Build agent input
    const summary = calculateSummary(windowScores);
    const input: AgentInput = {
      attemptId: this.attemptId,
      elapsedMs,
      windowScores: windowScores.map((w) => ({
        windowId: w.windowId,
        decision: w.decision,
        confidence: w.confidence,
        anomalyScore: w.anomalyScore,
      })),
      summary,
    };

    console.log(`[AgentScheduler] Invoking agent for attempt ${this.attemptId}`);

    // Call LLM
    this.isInvoking = true;
    const result = await callLLM(input).finally(() => {
      this.isInvoking = false;
    });

    if (!this.isRunning || this.decisionMade) {
      return;
    }

    const currentState = this.processor.getSessionState();
    if (!currentState || !currentState.isActive) {
      return;
    }

    if (result) {
      console.log(`[AgentScheduler] Decision: ${result.decision} - ${result.reason}`);
      await this.handleDecision(result, currentState);
    } else {
      const now = Date.now();
      if (now - this.lastNoDecisionLogMs > logThrottleMs) {
        console.log("[AgentScheduler] Agent waiting for more data");
        this.lastNoDecisionLogMs = now;
      }
    }
  }

  /**
   * Handle agent decision
   */
  private async handleDecision(
    result: AgentToolResult,
    sessionState: SessionState
  ): Promise<void> {
    if (this.decisionMade) return;
    this.decisionMade = true;
    // Stop the scheduler
    this.stop();

    // Mark session as ended
    this.processor.endSession();

    // Calculate confidence from recent scores
    const scores = this.processor.getWindowScores();
    const avgConfidence =
      scores.length > 0
        ? scores.reduce((sum, s) => sum + s.confidence, 0) / scores.length
        : 0.5;

    // Publish control message to SDK
    const controlMessage: SessionEndMessage = {
      type: "session_end",
      decision: result.decision,
      confidence: avgConfidence,
      reason: result.reason,
      timestamp: Date.now(),
    };

    await this.processor.publishControlMessage(controlMessage);

    // Notify listener
    this.onDecision?.(result, sessionState);
  }

  /**
   * Force a decision (e.g., on timeout)
   */
  async forceDecision(reason: string): Promise<void> {
    const sessionState = this.processor.getSessionState();
    if (!sessionState) return;

    const scores = this.processor.getWindowScores();
    const summary = calculateSummary(scores);

    // Use heuristic decision
    const decision: AgentDecision =
      summary.avgAnomalyScore <= agentConfig.thresholdReview ? "human" : "bot";

    const result: AgentToolResult = {
      decision,
      reason: `Forced decision: ${reason}. Average score: ${summary.avgAnomalyScore.toFixed(2)}`,
    };

    await this.handleDecision(result, sessionState);
  }

  /**
   * Stop the agent scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }
    if (this.invokeInterval) {
      clearInterval(this.invokeInterval);
      this.invokeInterval = null;
    }
    this.isRunning = false;
    console.log(`[AgentScheduler] Stopped for attempt ${this.attemptId}`);
  }

  /**
   * Check if scheduler is running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}

/**
 * Export utility functions for testing
 */
export { calculateSummary, heuristicDecision, buildSystemPrompt, buildUserMessage };
