"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Eye, Pause, Play, Trash2, ArrowUp, RotateCcw, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Playproof, type PointerTelemetryEvent } from "playproof/react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const MAX_EVENTS = 1000; // Cap to prevent memory issues
const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
const apiUrl = (path: string) => `${API_BASE}${path}`;

interface WoodwideResult {
  sessionId: string;
  decision: "pass" | "review" | "fail";
  confidence: number;
  anomaly: {
    modelId: string | null;
    anomalyScore: number | null;
    isAnomaly: boolean | null;
  };
  featureSummary: Record<string, number>;
  scoredAt: string;
  latencyMs: number;
}

export default function ObservabilityPage() {
  // Authoritative event list (not triggering re-renders)
  const eventsRef = useRef<PointerTelemetryEvent[]>([]);
  
  // Rendered snapshot for UI
  const [displayEvents, setDisplayEvents] = useState<PointerTelemetryEvent[]>([]);
  
  // Controls
  const [isPaused, setIsPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [resetKey, setResetKey] = useState(0);
  
  // Stats - track raw counts to avoid capping issues
  const [stats, setStats] = useState({
    totalEvents: 0,
    moveEvents: 0,
    clickEvents: 0,
    dragDistance: 0,
  });

  // Woodwide classification result
  const [woodwideResult, setWoodwideResult] = useState<WoodwideResult | null>(null);
  const [isScoring, setIsScoring] = useState(false);
  
  // Refs for scroll and drag calculation
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const isPausedRef = useRef(false);
  
  // Keep isPausedRef in sync
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Handle incoming telemetry batch from SDK
  const handleTelemetryBatch = useCallback((batch: PointerTelemetryEvent[]) => {
    if (isPausedRef.current) return;

    // Add to authoritative list
    batch.forEach(event => {
      eventsRef.current.push(event);
    });
    
    // Cap events to prevent memory bloat
    if (eventsRef.current.length > MAX_EVENTS) {
      eventsRef.current = eventsRef.current.slice(-MAX_EVENTS);
    }

    // Update stats - use raw running totals, not capped array length
    setStats((prev) => {
      let dragDistance = prev.dragDistance;
      let moveCount = prev.moveEvents;
      let clickCount = prev.clickEvents;
      let totalCount = prev.totalEvents;
      
      batch.forEach(event => {
        totalCount++;
        if (event.eventType === "move") {
          moveCount++;
          // Calculate drag distance if mouse is down and we have a previous position
          if (event.isDown && lastPosRef.current) {
            const dx = event.x - lastPosRef.current.x;
            const dy = event.y - lastPosRef.current.y;
            dragDistance += Math.sqrt(dx * dx + dy * dy);
          }
        } else if (event.eventType === "down") {
          clickCount++;
        }
        lastPosRef.current = { x: event.x, y: event.y };
      });

      return {
        totalEvents: totalCount,
        moveEvents: moveCount,
        clickEvents: clickCount,
        dragDistance: Math.round(dragDistance * 100) / 100,
      };
    });

    // Update display (show last 100 in table, newest first)
    setDisplayEvents([...eventsRef.current].slice(-100).reverse());
  }, []);

  // Handle telemetry data when game completes
  const handleTelemetry = useCallback(async (telemetry: {
    movements: Array<{ x: number; y: number; timestamp: number }>;
    clicks: Array<{ x: number; y: number; timestamp: number; targetHit: boolean }>;
    hits: number;
    misses: number;
    durationMs: number;
  }) => {
    if (!telemetry.movements || telemetry.movements.length === 0) {
      return null;
    }

    setIsScoring(true);
    setWoodwideResult(null);

    try {
      const response = await fetch(apiUrl("/api/v1/score"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: `obs_${Date.now()}`,
          gameType: "bubble-pop",
          deviceType: "mouse",
          durationMs: telemetry.durationMs,
          movements: telemetry.movements,
          clicks: telemetry.clicks,
          hits: telemetry.hits,
          misses: telemetry.misses,
        }),
      });

      if (response.ok) {
        const data: WoodwideResult = await response.json();
        setWoodwideResult(data);
        console.log("[Observability] Woodwide classification:", {
          decision: data.decision,
          anomalyScore: data.anomaly.anomalyScore,
          isAnomaly: data.anomaly.isAnomaly,
          classification: data.decision === "pass" ? "HUMAN" : "BOT",
        });
        
        return {
          decision: data.decision,
          anomalyScore: data.anomaly.anomalyScore || 0,
        };
      } else {
        console.error("[Observability] Woodwide scoring failed:", response.status);
        return null;
      }
    } catch (error) {
      console.error("[Observability] Error classifying with Woodwide:", error);
      return null;
    } finally {
      setIsScoring(false);
    }
  }, []);

  // Auto-scroll effect (scroll to top for newest events)
  useEffect(() => {
    if (autoScroll && scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = 0;
      }
    }
  }, [displayEvents, autoScroll]);

  // Clear all events
  const handleClear = () => {
    eventsRef.current = [];
    setDisplayEvents([]);
    setStats({
      totalEvents: 0,
      moveEvents: 0,
      clickEvents: 0,
      dragDistance: 0,
    });
    lastPosRef.current = null;
    setWoodwideResult(null);
  };

  // Reset the entire SDK
  const handleReset = () => {
    handleClear();
    setResetKey(prev => prev + 1);
  };

  // Format timestamp for display
  const formatTime = (tMs: number) => {
    return (tMs / 1000).toFixed(3) + "s";
  };

  // Get badge variant based on event type
  const getEventBadgeVariant = (eventType: string) => {
    switch (eventType) {
      case "down":
        return "default";
      case "up":
        return "secondary";
      case "move":
        return "outline";
      case "enter":
      case "leave":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Eye className="h-8 w-8 text-primary" />
              Observability Test
            </h1>
            <p className="text-muted-foreground">
              Track pointer movements via SDK telemetry hooks - works on any game
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={autoScroll ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoScroll(!autoScroll)}
              aria-label={autoScroll ? "Disable auto-scroll" : "Enable auto-scroll"}
            >
              <ArrowUp className="h-4 w-4 mr-1" />
              Auto-scroll
            </Button>
            <Button
              variant={isPaused ? "default" : "outline"}
              size="sm"
              onClick={() => setIsPaused(!isPaused)}
              aria-label={isPaused ? "Resume telemetry capture" : "Pause telemetry capture"}
            >
              {isPaused ? (
                <>
                  <Play className="h-4 w-4 mr-1" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={handleClear} aria-label="Clear all captured events">
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
            <Button variant="destructive" size="sm" onClick={handleReset} aria-label="Reset SDK and clear all data">
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Events</CardDescription>
              <CardTitle className="text-2xl">{stats.totalEvents}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Move Events</CardDescription>
              <CardTitle className="text-2xl">{stats.moveEvents}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Click Events</CardDescription>
              <CardTitle className="text-2xl">{stats.clickEvents}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Drag Distance</CardDescription>
              <CardTitle className="text-2xl">{stats.dragDistance}px</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Main Content: SDK Frame + Event Table */}
        <div className="grid grid-cols-2 gap-6">
          {/* PlayProof SDK Frame */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">PlayProof SDK</CardTitle>
              <CardDescription>
                Telemetry is captured via onTelemetryBatch - game-agnostic
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="w-full min-h-[500px] border rounded-lg p-4 bg-slate-50 dark:bg-slate-900">
                <Playproof
                  key={resetKey}
                  gameId="bubble-pop"
                  gameDuration={30000}
                  confidenceThreshold={0.7}
                  theme={{
                    primary: "#6366f1",
                    secondary: "#8b5cf6",
                    background: "#1a1a2e",
                    surface: "#2a2a3e",
                    text: "#f5f5f5",
                    textMuted: "#a1a1aa",
                    accent: "#22d3ee",
                    success: "#10b981",
                    error: "#ef4444",
                    border: "#3f3f5a",
                  }}
                  onTelemetryBatch={handleTelemetryBatch}
                  onTelemetry={handleTelemetry}
                  onSuccess={(result) => {
                    console.log("[Observability] Verification passed:", result);
                  }}
                  onFailure={(result) => {
                    console.log("[Observability] Verification failed:", result);
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Event Log Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Telemetry Event Log</CardTitle>
              <CardDescription>
                Live stream from SDK (showing last 100)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea ref={scrollAreaRef} className="h-[540px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-[80px]">Time</TableHead>
                      <TableHead className="w-[70px]">Type</TableHead>
                      <TableHead className="w-[60px]">X</TableHead>
                      <TableHead className="w-[60px]">Y</TableHead>
                      <TableHead className="w-[60px]">Down</TableHead>
                      <TableHead className="w-[70px]">Trusted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayEvents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Start the game to capture telemetry events
                        </TableCell>
                      </TableRow>
                    ) : (
                      displayEvents.map((event, index) => (
                        <TableRow key={`${event.timestampMs}-${index}`}>
                          <TableCell className="font-mono text-xs">
                            {formatTime(event.tMs)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getEventBadgeVariant(event.eventType)}>
                              {event.eventType}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{event.x}</TableCell>
                          <TableCell className="font-mono text-xs">{event.y}</TableCell>
                          <TableCell>
                            <span className={event.isDown ? "text-green-500 font-semibold" : "text-muted-foreground"}>
                              {event.isDown ? "YES" : "no"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={event.isTrusted ? "text-green-500" : "text-red-500"}>
                              {event.isTrusted ? "yes" : "NO"}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Woodwide Classification Result */}
        {isScoring && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Classifying with Woodwide anomaly detection model...</AlertDescription>
          </Alert>
        )}

        {woodwideResult && (
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Woodwide Classification
                {woodwideResult.decision === "pass" ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : woodwideResult.decision === "review" ? (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
              </CardTitle>
              <CardDescription>
                Anomaly detection model classification result
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Classification</p>
                  <p className="text-2xl font-bold">
                    {woodwideResult.decision === "pass" ? (
                      <span className="text-green-500">HUMAN</span>
                    ) : (
                      <span className="text-red-500">BOT</span>
                    )}
                  </p>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Anomaly Score</p>
                  <p className="text-2xl font-bold">
                    {woodwideResult.anomaly.anomalyScore?.toFixed(2) ?? "N/A"}
                  </p>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Decision</p>
                  <Badge 
                    variant={woodwideResult.decision === "pass" ? "default" : "destructive"}
                    className="text-lg px-3 py-1"
                  >
                    {woodwideResult.decision.toUpperCase()}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Model ID</p>
                  <p className="font-mono text-xs">
                    {woodwideResult.anomaly.modelId ?? "heuristic_fallback"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Is Anomaly</p>
                  <p className="font-semibold">
                    {woodwideResult.anomaly.isAnomaly === null
                      ? "N/A"
                      : woodwideResult.anomaly.isAnomaly
                      ? "Yes (Bot-like)"
                      : "No (Human-like)"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Confidence</p>
                  <p className="font-semibold">{(woodwideResult.confidence * 100).toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Latency</p>
                  <p className="font-semibold">{woodwideResult.latencyMs.toFixed(0)}ms</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-start gap-4 text-sm text-muted-foreground">
              <div>
                <strong className="text-foreground">How it works:</strong> The SDK automatically captures pointer telemetry 
                via <code className="bg-muted px-1 rounded">onTelemetryBatch</code>. This works on top of ANY game 
                that extends <code className="bg-muted px-1 rounded">ThreeBaseGame</code> - completely game-agnostic.
              </div>
              <div>
                <strong className="text-foreground">Woodwide Classification:</strong> When the game completes, telemetry is 
                automatically sent to Woodwide&apos;s anomaly detection model to classify the session as <strong>HUMAN</strong> or <strong>BOT</strong>.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
