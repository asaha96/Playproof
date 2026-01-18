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
import { Playproof, type PointerTelemetryEvent, type GameId } from "playproof/react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MAX_EVENTS = 1000; // Cap to prevent memory issues

interface HeuristicResult {
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
  const [selectedGame, setSelectedGame] = useState<GameId>("bubble-pop");
  
  // Stats - track raw counts to avoid capping issues
  const [stats, setStats] = useState({
    totalEvents: 0,
    moveEvents: 0,
    clickEvents: 0,
    dragDistance: 0,
  });

  // Heuristic classification result
  const [heuristicResult, setHeuristicResult] = useState<HeuristicResult | null>(null);
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

  // Heuristic scoring function - runs locally without API calls
  const calculateHeuristicScore = useCallback((data: {
    mouseMovements: Array<{ x: number; y: number; timestamp: number }>;
    clickTimings: number[];
    clickAccuracy: number;
  }): number => {
    let totalScore = 0;
    let weightSum = 0;
    
    // Mouse movement analysis (30% weight)
    if (data.mouseMovements && data.mouseMovements.length > 0) {
      const movements = data.mouseMovements;
      let variance = 0;
      let speed = 0;
      
      for (let i = 1; i < movements.length; i++) {
        const dx = movements[i].x - movements[i - 1].x;
        const dy = movements[i].y - movements[i - 1].y;
        const dt = movements[i].timestamp - movements[i - 1].timestamp;
        
        if (dt > 0) {
          speed += Math.sqrt(dx * dx + dy * dy) / dt;
          if (i > 1) {
            const prevDx = movements[i - 1].x - movements[i - 2].x;
            const prevDy = movements[i - 1].y - movements[i - 2].y;
            const angleChange = Math.abs(Math.atan2(dy, dx) - Math.atan2(prevDy, prevDx));
            variance += angleChange;
          }
        }
      }
      
      const avgVariance = variance / Math.max(1, movements.length - 2);
      const avgSpeed = speed / Math.max(1, movements.length - 1);
      const varianceScore = Math.min(1, avgVariance / 0.5);
      const speedScore = avgSpeed > 0.01 && avgSpeed < 5 ? 0.8 : 0.3;
      const movementScore = varianceScore * 0.6 + speedScore * 0.4;
      totalScore += movementScore * 0.3;
      weightSum += 0.3;
    }
    
    // Click timing analysis (30% weight)
    if (data.clickTimings && data.clickTimings.length > 1) {
      const intervals: number[] = [];
      for (let i = 1; i < data.clickTimings.length; i++) {
        intervals.push(data.clickTimings[i] - data.clickTimings[i - 1]);
      }
      const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const varianceVal = intervals.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / intervals.length;
      const stdDev = Math.sqrt(varianceVal);
      const cv = mean > 0 ? stdDev / mean : 0;
      
      let timingScore = 0.6;
      if (cv < 0.1) timingScore = 0.2;
      else if (cv > 1.5) timingScore = 0.4;
      else if (cv >= 0.2 && cv <= 0.8) timingScore = 0.9;
      
      totalScore += timingScore * 0.3;
      weightSum += 0.3;
    }
    
    // Click accuracy analysis (20% weight)
    if (data.clickAccuracy !== undefined) {
      let accuracyScore = 0.6;
      if (data.clickAccuracy >= 0.98) accuracyScore = 0.5;
      else if (data.clickAccuracy < 0.3) accuracyScore = 0.3;
      else if (data.clickAccuracy >= 0.6 && data.clickAccuracy <= 0.95) accuracyScore = 0.9;
      
      totalScore += accuracyScore * 0.2;
      weightSum += 0.2;
    }
    
    return weightSum > 0 ? totalScore / weightSum : 0;
  }, []);

  // Handle telemetry data when game completes - use heuristic model (no API calls)
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
    setHeuristicResult(null);

    try {
      // Convert telemetry to format expected by heuristic scorer
      const behaviorData = {
        mouseMovements: telemetry.movements,
        clickTimings: telemetry.clicks.map(c => c.timestamp),
        clickAccuracy: telemetry.hits / Math.max(1, telemetry.hits + telemetry.misses),
      };

      // Calculate confidence score using heuristic model
      const confidenceScore = calculateHeuristicScore(behaviorData);
      const threshold = 0.7; // Default confidence threshold
      const passed = confidenceScore >= threshold;
      
      // Convert to HeuristicResult format for display consistency
      const result: HeuristicResult = {
        sessionId: `obs_${Date.now()}`,
        decision: passed ? "pass" : "fail",
        confidence: confidenceScore,
        anomaly: {
          modelId: "heuristic_fallback",
          anomalyScore: null,
          isAnomaly: !passed,
        },
        featureSummary: {},
        scoredAt: new Date().toISOString(),
        latencyMs: 0, // Heuristic is instant
      };
      
      setHeuristicResult(result);
      console.log("[Observability] Heuristic classification:", {
        decision: result.decision,
        confidence: confidenceScore,
        passed,
        classification: result.decision === "pass" ? "HUMAN" : "BOT",
      });
      
      return {
        decision: result.decision,
        anomalyScore: 0,
      };
    } catch (error) {
      console.error("[Observability] Error classifying with heuristic model:", error);
      return null;
    } finally {
      setIsScoring(false);
    }
  }, [calculateHeuristicScore]);

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
    setHeuristicResult(null);
  };

  // Reset the entire SDK
  const handleReset = () => {
    handleClear();
    setResetKey(prev => prev + 1);
  };

  // Handle game selection change
  const handleGameChange = (gameId: GameId | null) => {
    if (gameId) {
      setSelectedGame(gameId);
      handleReset(); // Reset SDK when game changes
    }
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
            <Select value={selectedGame} onValueChange={handleGameChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select game" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bubble-pop">Bubble Pop</SelectItem>
                <SelectItem value="osu">OSU</SelectItem>
                <SelectItem value="snake">Snake</SelectItem>
                <SelectItem value="random">Random</SelectItem>
              </SelectContent>
            </Select>
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
                  gameId={selectedGame}
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

        {/* Heuristic Classification Result */}
        {isScoring && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Classifying with heuristic model...</AlertDescription>
          </Alert>
        )}

        {heuristicResult && (
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Heuristic Classification
                {heuristicResult.decision === "pass" ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : heuristicResult.decision === "review" ? (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
              </CardTitle>
              <CardDescription>
                Heuristic model classification result (no API call required)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Classification</p>
                  <p className="text-2xl font-bold">
                    {heuristicResult.decision === "pass" ? (
                      <span className="text-green-500">HUMAN</span>
                    ) : (
                      <span className="text-red-500">BOT</span>
                    )}
                  </p>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Confidence Score</p>
                  <p className="text-2xl font-bold">
                    {(heuristicResult.confidence * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Decision</p>
                  <Badge 
                    variant={heuristicResult.decision === "pass" ? "default" : "destructive"}
                    className="text-lg px-3 py-1"
                  >
                    {heuristicResult.decision.toUpperCase()}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Model ID</p>
                  <p className="font-mono text-xs">
                    {heuristicResult.anomaly.modelId ?? "heuristic_fallback"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Is Anomaly</p>
                  <p className="font-semibold">
                    {heuristicResult.anomaly.isAnomaly === null
                      ? "N/A"
                      : heuristicResult.anomaly.isAnomaly
                      ? "Yes (Bot-like)"
                      : "No (Human-like)"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Threshold</p>
                  <p className="font-semibold">70%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Latency</p>
                  <p className="font-semibold">&lt;1ms (instant)</p>
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
                <strong className="text-foreground">Heuristic Classification:</strong> When the game completes, telemetry is 
                analyzed using the built-in heuristic model (no API calls) to classify the session as <strong>HUMAN</strong> or <strong>BOT</strong>.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
