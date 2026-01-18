"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, CheckCircle2, XCircle, AlertCircle, Play, Database, BarChart3, Gamepad2, Terminal } from "lucide-react";
import { PlayproofCaptcha, type PlayproofCaptchaResult } from "@/components/playproof-captcha";

// PointerTelemetryEvent type (matching SDK)
type PointerTelemetryEvent = {
  timestampMs: number;
  tMs: number;
  x: number;
  y: number;
  clientX: number;
  clientY: number;
  isDown: boolean;
  eventType: 'move' | 'down' | 'up' | 'enter' | 'leave';
  pointerType: string;
  pointerId: number;
  isTrusted: boolean;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

interface ScoringResult {
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

interface BatchStats {
  queue: {
    total: number;
    unprocessed: number;
    processed: number;
  };
  scheduler: {
    running: boolean;
    isProcessing: boolean;
    lastProcessed: string | null;
  };
}

interface ConsoleLog {
  timestamp: string;
  level: "log" | "info" | "warn" | "error";
  message: string;
  data?: any;
}

export default function WoodwideTestPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScoringResult | null>(null);
  const [batchStats, setBatchStats] = useState<BatchStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gameResult, setGameResult] = useState<ScoringResult | null>(null);
  const [gameKey, setGameKey] = useState(0);
  const [selectedGameType, setSelectedGameType] = useState<"bubble-pop" | "archery" | "random">("bubble-pop");
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);
  const [shouldAutoEnd, setShouldAutoEnd] = useState(false);
  const playproofInstanceRef = useRef<any>(null);
  const telemetryCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const accumulatedTelemetryRef = useRef<{
    movements: Array<{ x: number; y: number; timestamp: number }>;
    clicks: Array<{ x: number; y: number; timestamp: number; targetHit: boolean }>;
    hits: number;
    misses: number;
    startTime: number;
  } | null>(null);

  // Telemetry tracking (same as observability page)
  const MAX_EVENTS = 1000;
  const eventsRef = useRef<PointerTelemetryEvent[]>([]);
  const [displayEvents, setDisplayEvents] = useState<PointerTelemetryEvent[]>([]);
  const [telemetryStats, setTelemetryStats] = useState({
    totalEvents: 0,
    moveEvents: 0,
    clickEvents: 0,
    dragDistance: 0,
  });
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Generate test telemetry
  const generateTestTelemetry = (type: "human" | "bot" | "short") => {
    const movements: Array<{ x: number; y: number; timestamp: number }> = [];
    let timestamp = 0;

    if (type === "human") {
      // Human-like: natural variation, slight curves, pauses
      for (let i = 0; i < 100; i++) {
        const x = 100 + Math.random() * 400 + Math.sin(i * 0.1) * 20;
        const y = 100 + Math.random() * 400 + Math.cos(i * 0.1) * 20;
        timestamp += 16.67 + Math.random() * 10; // ~60fps with variation
        movements.push({ x, y, timestamp });
      }
    } else if (type === "bot") {
      // Bot-like: perfect straight lines, consistent timing
      for (let i = 0; i < 50; i++) {
        const x = 100 + (i * 8);
        const y = 100 + (i * 8);
        timestamp += 20; // Perfect timing
        movements.push({ x, y, timestamp });
      }
    } else {
      // Short session
      for (let i = 0; i < 10; i++) {
        const x = 100 + Math.random() * 200;
        const y = 100 + Math.random() * 200;
        timestamp += 16.67;
        movements.push({ x, y, timestamp });
      }
    }

    return {
      sessionId: `test_${type}_${Date.now()}`,
      gameType: "bubble-pop" as const,
      deviceType: "mouse" as const,
      durationMs: timestamp,
      movements,
      clicks: type === "human" ? [
        { x: 200, y: 200, timestamp: 1000, targetHit: true },
        { x: 300, y: 300, timestamp: 2000, targetHit: true },
      ] : [],
      hits: type === "human" ? 2 : 0,
      misses: 0,
    };
  };

  const testScoring = async (type: "human" | "bot" | "short", useBatch: boolean = false) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const telemetry = generateTestTelemetry(type);
      const response = await fetch(`${API_URL}/api/v1/score`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(telemetry),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const fetchBatchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/batch/stats`);
      if (response.ok) {
        const data = await response.json();
        setBatchStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch batch stats:", err);
    }
  };

  const triggerBatch = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/v1/batch/process`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      alert(`Batch processed: ${data.processed} sessions, ${data.success} successful`);
      await fetchBatchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  // Console log interceptor with infinite loop prevention
  useEffect(() => {
    const originalLog = console.log;
    const originalInfo = console.info;
    const originalWarn = console.warn;
    const originalError = console.error;
    
    // Flag to prevent recursive calls
    let isLogging = false;
    const logQueue: ConsoleLog[] = [];
    let logTimeout: NodeJS.Timeout | null = null;

    const flushLogs = () => {
      if (logQueue.length === 0 || isLogging) return;
      
      isLogging = true;
      const logsToAdd = [...logQueue];
      logQueue.length = 0;
      
      setConsoleLogs(prev => {
        // Keep last 100 logs
        return [...prev.slice(-99), ...logsToAdd];
      });
      
      // Reset flag after a short delay to allow React to process
      setTimeout(() => {
        isLogging = false;
        if (logQueue.length > 0) {
          flushLogs();
        }
      }, 10);
    };

    const addLog = (level: ConsoleLog["level"], ...args: any[]) => {
      // Prevent infinite loops by checking if we're already logging
      if (isLogging) return;
      
      // Skip logs that are too long or might cause issues
      try {
        const message = args.map(arg => {
          if (arg === null || arg === undefined) return String(arg);
          if (typeof arg === "object") {
            // Limit object stringification to prevent huge logs
            try {
              return JSON.stringify(arg, null, 2).slice(0, 1000);
            } catch {
              return "[Object]";
            }
          }
          return String(arg).slice(0, 500);
        }).join(" ");
        
        // Skip empty messages
        if (!message.trim()) return;
        
        const newLog: ConsoleLog = {
          timestamp: new Date().toLocaleTimeString(),
          level,
          message,
          data: args.length > 1 && args.length <= 3 ? args : undefined,
        };
        
        logQueue.push(newLog);
        
        // Debounce log updates to prevent excessive re-renders
        if (logTimeout) {
          clearTimeout(logTimeout);
        }
        logTimeout = setTimeout(flushLogs, 100);
      } catch (err) {
        // Silently fail if logging causes issues
      }
    };

    console.log = (...args: any[]) => {
      originalLog(...args);
      addLog("log", ...args);
    };
    console.info = (...args: any[]) => {
      originalInfo(...args);
      addLog("info", ...args);
    };
    console.warn = (...args: any[]) => {
      originalWarn(...args);
      addLog("warn", ...args);
    };
    console.error = (...args: any[]) => {
      originalError(...args);
      addLog("error", ...args);
    };

    return () => {
      if (logTimeout) {
        clearTimeout(logTimeout);
      }
      console.log = originalLog;
      console.info = originalInfo;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  // Check telemetry periodically and auto-end if Woodwide verifies human
  const checkTelemetryAndAutoEnd = useCallback(async () => {
    if (!accumulatedTelemetryRef.current || !playproofInstanceRef.current) return;
    if (!shouldAutoEnd) return; // Double-check auto-end is enabled

    const telemetry = accumulatedTelemetryRef.current;
    const currentTime = Date.now();
    const durationMs = currentTime - telemetry.startTime;

    // Need minimum telemetry to make a decision (at least 3 seconds of data and 20 movements)
    // Increased thresholds to prevent premature ending
    if (durationMs < 3000 || telemetry.movements.length < 20) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/v1/score`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: `game_${Date.now()}`,
          gameType: selectedGameType,
          deviceType: "mouse",
          durationMs,
          movements: telemetry.movements,
          clicks: telemetry.clicks,
          hits: telemetry.hits,
          misses: telemetry.misses,
        }),
      });

      if (!response.ok) {
        return;
      }

      const data: ScoringResult = await response.json();
      console.log("[Auto-check] Woodwide result:", data.decision, "score:", data.anomaly.anomalyScore);

      // If Woodwide verifies human, end the game early
      // Only auto-end if we have enough data and decision is pass
      if (data.decision === "pass" && shouldAutoEnd && durationMs >= 3000 && telemetry.movements.length >= 20) {
        console.log("[Auto-end] Woodwide verified human - ending game early", {
          duration: durationMs,
          movements: telemetry.movements.length,
          decision: data.decision,
        });
        setGameResult(data);
        
        // End the game by calling the SDK's internal endGame method
        if (playproofInstanceRef.current?.game?.endGame) {
          playproofInstanceRef.current.game.endGame();
        }
        
        // Clear the interval
        if (telemetryCheckIntervalRef.current) {
          clearInterval(telemetryCheckIntervalRef.current);
          telemetryCheckIntervalRef.current = null;
        }
      }
    } catch (err) {
      console.error("[Auto-check] Error:", err);
    }
  }, [selectedGameType, shouldAutoEnd]);

  // Fetch batch stats on mount
  React.useEffect(() => {
    fetchBatchStats();
    const interval = setInterval(fetchBatchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  // Handle incoming telemetry batch from SDK (same as observability page)
  const handleTelemetryBatch = useCallback((batch: PointerTelemetryEvent[]) => {
    // Add to authoritative list
    batch.forEach(event => {
      eventsRef.current.push(event);
    });
    
    // Cap events to prevent memory bloat
    if (eventsRef.current.length > MAX_EVENTS) {
      eventsRef.current = eventsRef.current.slice(-MAX_EVENTS);
    }

    // Update stats - use raw running totals, not capped array length
    setTelemetryStats((prev) => {
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

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (telemetryCheckIntervalRef.current) {
        clearInterval(telemetryCheckIntervalRef.current);
      }
    };
  }, []);

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

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case "pass":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "review":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "fail":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  const getDecisionIcon = (decision: string) => {
    switch (decision) {
      case "pass":
        return <CheckCircle2 className="h-4 w-4" />;
      case "review":
        return <AlertCircle className="h-4 w-4" />;
      case "fail":
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Woodwide Integration Test</h1>
        <p className="text-muted-foreground mt-2">
          Test the full Woodwide bot detection system with real-time scoring and batch inference
        </p>
      </div>

      <Tabs defaultValue="games" className="space-y-4">
        <TabsList>
          <TabsTrigger value="games">
            <Gamepad2 className="h-4 w-4 mr-2" />
            Actual Games
          </TabsTrigger>
          <TabsTrigger value="realtime">
            <Play className="h-4 w-4 mr-2" />
            Real-time Scoring
          </TabsTrigger>
          <TabsTrigger value="batch">
            <Database className="h-4 w-4 mr-2" />
            Batch Inference
          </TabsTrigger>
          <TabsTrigger value="stats">
            <BarChart3 className="h-4 w-4 mr-2" />
            System Stats
          </TabsTrigger>
        </TabsList>

        <TabsContent value="games" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Test with Actual Games</CardTitle>
                    <CardDescription>
                      Play real PlayProof games and see Woodwide scoring in action
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Auto-end:</label>
                    <input
                      type="checkbox"
                      checked={shouldAutoEnd}
                      onChange={(e) => {
                        setShouldAutoEnd(e.target.checked);
                        if (!e.target.checked && telemetryCheckIntervalRef.current) {
                          clearInterval(telemetryCheckIntervalRef.current);
                          telemetryCheckIntervalRef.current = null;
                        }
                      }}
                      className="w-4 h-4"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2 items-center">
                  <label className="text-sm font-medium">Game Type:</label>
                  <select
                    value={selectedGameType}
                    onChange={(e) => {
                      setSelectedGameType(e.target.value as "bubble-pop" | "archery" | "random");
                      setGameKey((k) => k + 1);
                      accumulatedTelemetryRef.current = null;
                      if (telemetryCheckIntervalRef.current) {
                        clearInterval(telemetryCheckIntervalRef.current);
                        telemetryCheckIntervalRef.current = null;
                      }
                    }}
                    className="px-3 py-1 border rounded-md text-sm bg-background"
                  >
                    <option value="bubble-pop">Bubble Pop</option>
                    <option value="archery">Archery</option>
                    <option value="random">Random</option>
                  </select>
                  <Button
                    onClick={() => {
                      setGameKey((k) => k + 1);
                      accumulatedTelemetryRef.current = null;
                      setGameResult(null);
                      if (telemetryCheckIntervalRef.current) {
                        clearInterval(telemetryCheckIntervalRef.current);
                        telemetryCheckIntervalRef.current = null;
                      }
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Reset Game
                  </Button>
                </div>

                <div className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-900">
                  <PlayproofCaptcha
                    key={gameKey}
                    gameType={selectedGameType}
                    difficulty="normal"
                    onInstanceReady={(instance) => {
                      playproofInstanceRef.current = instance;
                      console.log("[Woodwide Test] SDK instance ready");
                    }}
                    onTelemetryBatch={(batch) => {
                      // Only process if batch is an array of PointerTelemetryEvent (during gameplay)
                      // When game completes, batch will be BehaviorData (not an array)
                      if (Array.isArray(batch) && batch.length > 0 && batch[0]?.eventType) {
                        // Handle telemetry batch for event log and stats (same as observability page)
                        handleTelemetryBatch(batch);
                        
                        // Also accumulate telemetry for periodic auto-end checks
                        if (shouldAutoEnd) {
                          if (!accumulatedTelemetryRef.current) {
                            accumulatedTelemetryRef.current = {
                              movements: [],
                              clicks: [],
                              hits: 0,
                              misses: 0,
                              startTime: Date.now(),
                            };
                            
                            // Start periodic checks if auto-end is enabled
                            if (!telemetryCheckIntervalRef.current) {
                              telemetryCheckIntervalRef.current = setInterval(checkTelemetryAndAutoEnd, 2000);
                              console.log("[Auto-end] Started periodic telemetry checks");
                            }
                          }
                          
                          // Add movements and clicks from events
                          batch.forEach((event) => {
                            const relativeTime = event.tMs * 1000; // Convert to ms
                            
                            if (event.eventType === "move" || event.eventType === "down") {
                              accumulatedTelemetryRef.current!.movements.push({
                                x: event.x,
                                y: event.y,
                                timestamp: relativeTime,
                              });
                            }
                            if (event.eventType === "down") {
                              accumulatedTelemetryRef.current!.clicks.push({
                                x: event.x,
                                y: event.y,
                                timestamp: relativeTime,
                                targetHit: false, // We don't know from pointer events alone
                              });
                            }
                          });
                        }
                      }
                      // If batch is BehaviorData (game completed), it will be handled by onTelemetry hook
                    }}
                    onTelemetry={async (telemetry) => {
                      console.log("Telemetry received:", {
                        movements: telemetry.movements.length,
                        clicks: telemetry.clicks.length,
                        duration: telemetry.durationMs,
                        hits: telemetry.hits,
                        misses: telemetry.misses,
                      });
                      
                      setLoading(true);
                      setError(null);

                      try {
                        const response = await fetch(`${API_URL}/api/v1/score`, {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            sessionId: `game_${Date.now()}`,
                            gameType: selectedGameType,
                            deviceType: "mouse",
                            durationMs: telemetry.durationMs,
                            movements: telemetry.movements,
                            clicks: telemetry.clicks,
                            hits: telemetry.hits,
                            misses: telemetry.misses,
                          }),
                        });

                        if (!response.ok) {
                          const errorData = await response.json();
                          throw new Error(errorData.message || `HTTP ${response.status}`);
                        }

                        const data = await response.json();
                        console.log("Scoring result:", data);
                        setGameResult(data);
                        
                        // Clear interval when game completes
                        if (telemetryCheckIntervalRef.current) {
                          clearInterval(telemetryCheckIntervalRef.current);
                          telemetryCheckIntervalRef.current = null;
                        }
                        accumulatedTelemetryRef.current = null;
                        
                        // Return Woodwide decision for the game to display
                        return {
                          decision: data.decision,
                          anomalyScore: data.anomaly.anomalyScore || 0,
                        };
                      } catch (err) {
                        console.error("Scoring error:", err);
                        setError(err instanceof Error ? err.message : "Unknown error");
                        return null; // Return null if scoring fails
                      } finally {
                        setLoading(false);
                      }
                    }}
                    onSuccess={(result) => {
                      console.log("Game completed successfully:", result);
                    }}
                    onFailure={(result) => {
                      console.log("Game failed:", result);
                    }}
                  />
                </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {gameResult && (
                <Card className="border-2">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Game Scoring Result</CardTitle>
                      <Badge className={getDecisionColor(gameResult.decision)}>
                        {getDecisionIcon(gameResult.decision)}
                        <span className="ml-2 uppercase">{gameResult.decision}</span>
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Session ID</p>
                        <p className="font-mono text-sm">{gameResult.sessionId}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Confidence</p>
                        <p className="font-semibold">{(gameResult.confidence * 100).toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Anomaly Score</p>
                        <p className="font-semibold">
                          {gameResult.anomaly.anomalyScore?.toFixed(2) ?? "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Model</p>
                        <p className="font-mono text-sm">
                          {gameResult.anomaly.modelId ?? "heuristic_fallback"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Is Anomaly</p>
                        <p className="font-semibold">
                          {gameResult.anomaly.isAnomaly === null
                            ? "N/A"
                            : gameResult.anomaly.isAnomaly
                            ? "Yes"
                            : "No"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Latency</p>
                        <p className="font-semibold">{gameResult.latencyMs.toFixed(0)}ms</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Key Features</p>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        {Object.entries(gameResult.featureSummary).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-muted-foreground">{key}:</span>
                            <span className="font-mono">{typeof value === "number" ? value.toFixed(3) : value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          {/* Telemetry Event Log Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Telemetry Event Log</CardTitle>
              <CardDescription>
                Live stream from SDK (showing last 100)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea ref={scrollAreaRef} className="h-[600px]">
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

          {/* Console Log Panel */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="h-5 w-5" />
                  <CardTitle>Console Logs</CardTitle>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConsoleLogs([])}
                >
                  Clear
                </Button>
              </div>
              <CardDescription>
                Real-time console output from the game and Woodwide integration
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                <div className="p-4 space-y-1 font-mono text-xs">
                  {consoleLogs.length === 0 ? (
                    <div className="text-muted-foreground text-center py-8">
                      No logs yet. Start playing to see console output.
                    </div>
                  ) : (
                    consoleLogs.map((log, index) => (
                      <div
                        key={index}
                        className={`p-2 rounded border-l-2 ${
                          log.level === "error"
                            ? "bg-red-500/10 border-red-500 text-red-400"
                            : log.level === "warn"
                            ? "bg-yellow-500/10 border-yellow-500 text-yellow-400"
                            : log.level === "info"
                            ? "bg-blue-500/10 border-blue-500 text-blue-400"
                            : "bg-muted/50 border-muted-foreground text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-muted-foreground">{log.timestamp}</span>
                          <Badge variant="outline" className="text-xs">
                            {log.level.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="whitespace-pre-wrap break-words">{log.message}</div>
                        {log.data && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-muted-foreground text-xs">
                              View data
                            </summary>
                            <pre className="mt-2 p-2 bg-background rounded text-xs overflow-auto">
                              {JSON.stringify(log.data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
        </TabsContent>

        <TabsContent value="realtime" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Real-time Scoring Tests</CardTitle>
              <CardDescription>
                Test the scoring API with different movement patterns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={() => testScoring("human", false)}
                  disabled={loading}
                  variant="outline"
                >
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                  Test Human-like
                </Button>
                <Button
                  onClick={() => testScoring("bot", false)}
                  disabled={loading}
                  variant="outline"
                >
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                  Test Bot-like
                </Button>
                <Button
                  onClick={() => testScoring("short", false)}
                  disabled={loading}
                  variant="outline"
                >
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                  Test Short Session
                </Button>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {result && (
                <Card className="border-2">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Scoring Result</CardTitle>
                      <Badge className={getDecisionColor(result.decision)}>
                        {getDecisionIcon(result.decision)}
                        <span className="ml-2 uppercase">{result.decision}</span>
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Session ID</p>
                        <p className="font-mono text-sm">{result.sessionId}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Confidence</p>
                        <p className="font-semibold">{(result.confidence * 100).toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Anomaly Score</p>
                        <p className="font-semibold">
                          {result.anomaly.anomalyScore?.toFixed(2) ?? "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Model</p>
                        <p className="font-mono text-sm">
                          {result.anomaly.modelId ?? "heuristic_fallback"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Is Anomaly</p>
                        <p className="font-semibold">
                          {result.anomaly.isAnomaly === null
                            ? "N/A"
                            : result.anomaly.isAnomaly
                            ? "Yes"
                            : "No"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Latency</p>
                        <p className="font-semibold">{result.latencyMs.toFixed(0)}ms</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Key Features</p>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        {Object.entries(result.featureSummary).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-muted-foreground">{key}:</span>
                            <span className="font-mono">{typeof value === "number" ? value.toFixed(3) : value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batch" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Batch Inference</CardTitle>
              <CardDescription>
                Manage batch processing queue and trigger manual batches
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button onClick={triggerBatch} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
                  Process Batch
                </Button>
                <Button onClick={fetchBatchStats} variant="outline">
                  Refresh Stats
                </Button>
              </div>

              {batchStats && (
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Queue Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Total:</span>
                          <span className="font-semibold">{batchStats.queue.total}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Unprocessed:</span>
                          <span className="font-semibold text-yellow-500">{batchStats.queue.unprocessed}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Processed:</span>
                          <span className="font-semibold text-green-500">{batchStats.queue.processed}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Scheduler Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Running:</span>
                          <Badge variant={batchStats.scheduler.running ? "default" : "secondary"}>
                            {batchStats.scheduler.running ? "Yes" : "No"}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Processing:</span>
                          <Badge variant={batchStats.scheduler.isProcessing ? "default" : "secondary"}>
                            {batchStats.scheduler.isProcessing ? "Yes" : "No"}
                          </Badge>
                        </div>
                        {batchStats.scheduler.lastProcessed && (
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Last Processed:</span>
                            <span className="text-xs font-mono">
                              {new Date(batchStats.scheduler.lastProcessed).toLocaleTimeString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Health</CardTitle>
              <CardDescription>API and Woodwide integration status</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={fetchBatchStats} variant="outline">
                Refresh Health
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
