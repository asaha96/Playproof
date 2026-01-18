"use client";

import { useState, useRef, useCallback, useEffect, useId } from "react";
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
import { Eye, Pause, Play, Trash2, ArrowUp, RotateCcw } from "lucide-react";
import type { PointerTelemetryEvent } from "playproof";

const MAX_EVENTS = 1000; // Cap to prevent memory issues

export default function ObservabilityPage() {
  const uniqueId = useId();
  const containerId = `playproof-observability-${uniqueId.replace(/:/g, "-")}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const playproofInstanceRef = useRef<any>(null);
  
  // Authoritative event list (not triggering re-renders)
  const eventsRef = useRef<PointerTelemetryEvent[]>([]);
  
  // Rendered snapshot for UI
  const [displayEvents, setDisplayEvents] = useState<PointerTelemetryEvent[]>([]);
  
  // Controls
  const [isPaused, setIsPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  
  // Stats - track raw counts to avoid capping issues
  const [stats, setStats] = useState({
    totalEvents: 0,
    moveEvents: 0,
    clickEvents: 0,
    dragDistance: 0,
  });
  
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

  // Cleanup function
  const cleanup = useCallback(() => {
    if (playproofInstanceRef.current) {
      try {
        playproofInstanceRef.current.destroy();
      } catch (e) {
        // Ignore cleanup errors
      }
      playproofInstanceRef.current = null;
    }
    setIsLoaded(false);
  }, []);

  // Initialize SDK with telemetry hooks
  useEffect(() => {
    let mounted = true;

    const initPlayproof = async () => {
      try {
        cleanup();

        // Dynamic import to avoid SSR issues
        const { Playproof } = await import("playproof");

        if (!mounted || !containerRef.current) return;

        // Ensure container has the ID
        containerRef.current.id = containerId;

        // Create Playproof instance with telemetry hooks
        const instance = new Playproof({
          containerId,
          confidenceThreshold: 0.7,
          gameId: "bubble-pop",
          gameDuration: 30000, // 30 seconds for observability testing
          logTelemetry: false, // Set to true for console debugging
          theme: {
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
          },
          hooks: {
            onTelemetryBatch: handleTelemetryBatch,
            onAttemptEnd: null,
            regenerate: null,
          },
          onSuccess: (result) => {
            console.log("[Observability] Verification passed:", result);
          },
          onFailure: (result) => {
            console.log("[Observability] Verification failed:", result);
          },
        });

        playproofInstanceRef.current = instance;

        // Start verification UI
        await instance.verify();

        if (mounted) {
          setIsLoaded(true);
        }
      } catch (err) {
        console.error("Failed to initialize Playproof:", err);
      }
    };

    initPlayproof();

    return () => {
      mounted = false;
      cleanup();
    };
  }, [containerId, handleTelemetryBatch, cleanup, resetKey]);

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
                Telemetry is captured via hooks.onTelemetryBatch - game-agnostic
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div
                ref={containerRef}
                id={containerId}
                className="w-full min-h-[500px]"
              />
              {!isLoaded && (
                <div className="flex items-center justify-center h-[500px] text-muted-foreground">
                  Loading SDK...
                </div>
              )}
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

        {/* Instructions */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-start gap-4 text-sm text-muted-foreground">
              <div>
                <strong className="text-foreground">How it works:</strong> The SDK automatically captures pointer telemetry 
                via <code className="bg-muted px-1 rounded">hooks.onTelemetryBatch</code>. This works on top of ANY game 
                that extends <code className="bg-muted px-1 rounded">ThreeBaseGame</code> - completely game-agnostic.
              </div>
              <div>
                <strong className="text-foreground">Raw data access:</strong> All telemetry events are stored and can be 
                included in the final <code className="bg-muted px-1 rounded">VerificationResult</code> for server-side analysis.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
