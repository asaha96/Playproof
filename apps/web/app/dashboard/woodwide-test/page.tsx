"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, XCircle, AlertCircle, Play, Database, BarChart3, Gamepad2 } from "lucide-react";
import { Playproof, type VerificationResult } from "playproof/react";

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

export default function WoodwideTestPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScoringResult | null>(null);
  const [batchStats, setBatchStats] = useState<BatchStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gameResult, setGameResult] = useState<VerificationResult | null>(null);
  const [gameKey, setGameKey] = useState(0);
  const [selectedGameType, setSelectedGameType] = useState<"bubble-pop" | "archery" | "osu">("bubble-pop");

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

  // Fetch batch stats on mount
  React.useEffect(() => {
    fetchBatchStats();
    const interval = setInterval(fetchBatchStats, 5000);
    return () => clearInterval(interval);
  }, []);

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
          <Card>
            <CardHeader>
              <CardTitle>Test with Actual Games</CardTitle>
              <CardDescription>
                Play real PlayProof games and see Woodwide scoring in action
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 items-center">
                <label className="text-sm font-medium">Game Type:</label>
                <select
                  value={selectedGameType}
                  onChange={(e) => {
                    setSelectedGameType(e.target.value as "bubble-pop" | "archery" | "osu");
                    setGameKey((k) => k + 1);
                  }}
                  className="px-3 py-1 border rounded-md text-sm bg-background"
                >
                  <option value="bubble-pop">Bubble Pop</option>
                  <option value="archery">Archery</option>
                  <option value="osu">Osu!</option>
                </select>
                <Button
                  onClick={() => setGameKey((k) => k + 1)}
                  variant="outline"
                  size="sm"
                >
                  Reset Game
                </Button>
              </div>

              <div className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-900">
                <Playproof
                  key={gameKey}
                  gameId={selectedGameType}
                  onSuccess={(result: VerificationResult) => {
                    console.log("Game completed successfully:", result);
                    setGameResult(result);
                  }}
                  onFailure={(result: VerificationResult) => {
                    console.log("Game failed:", result);
                    setGameResult(result);
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
                      <CardTitle>Game Verification Result</CardTitle>
                      <Badge className={gameResult.passed ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}>
                        {gameResult.passed ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        <span className="ml-2 uppercase">{gameResult.passed ? "PASS" : "FAIL"}</span>
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Score</p>
                        <p className="font-semibold">{(gameResult.score * 100).toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Threshold</p>
                        <p className="font-semibold">{(gameResult.threshold * 100).toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Duration</p>
                        <p className="font-semibold">{gameResult.behaviorData?.sessionDuration?.toFixed(0) ?? "N/A"}ms</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Movements</p>
                        <p className="font-semibold">{gameResult.behaviorData?.totalMovements ?? "N/A"}</p>
                      </div>
                    </div>

                    {gameResult.behaviorData && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Behavior Metrics</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Avg Speed:</span>
                            <span className="font-mono">{gameResult.behaviorData.averageSpeed?.toFixed(2) ?? "N/A"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Speed Variance:</span>
                            <span className="font-mono">{gameResult.behaviorData.speedVariance?.toFixed(2) ?? "N/A"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Direction Changes:</span>
                            <span className="font-mono">{gameResult.behaviorData.directionChanges ?? "N/A"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Click Accuracy:</span>
                            <span className="font-mono">{(gameResult.behaviorData.clickAccuracy * 100)?.toFixed(1) ?? "N/A"}%</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
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
