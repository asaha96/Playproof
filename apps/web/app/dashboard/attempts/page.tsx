"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, CheckCircle, XCircle, AlertTriangle, Clock } from "lucide-react";

/**
 * Attempts Page
 * 
 * Displays a list of verification attempts and their results.
 * Shows the decision (pass/review/fail) and anomaly score from Woodwide scoring.
 * Does NOT show individual telemetry events - those are internal to Woodwide.
 */
export default function AttemptsPage() {
  // Fetch recent attempts with results
  const attempts = useQuery(api.realtime.listRecentAttemptsWithResults, { limit: 100 });

  // Format timestamp for display
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // Get badge variant based on result
  const getResultBadge = (result: string | null) => {
    switch (result) {
      case "pass":
        return (
          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            Pass
          </Badge>
        );
      case "review":
        return (
          <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Review
          </Badge>
        );
      case "fail":
        return (
          <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
            <XCircle className="h-3 w-3 mr-1" />
            Fail
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  // Calculate statistics
  const stats = {
    total: attempts?.length ?? 0,
    passed: attempts?.filter(a => a.result === "pass").length ?? 0,
    review: attempts?.filter(a => a.result === "review").length ?? 0,
    failed: attempts?.filter(a => a.result === "fail").length ?? 0,
    pending: attempts?.filter(a => !a.result).length ?? 0,
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary" />
            Verification Attempts
          </h1>
          <p className="text-muted-foreground">
            View all verification attempts and their Woodwide scoring results
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total</CardDescription>
              <CardTitle className="text-2xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                Passed
              </CardDescription>
              <CardTitle className="text-2xl text-green-500">{stats.passed}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-yellow-500" />
                Review
              </CardDescription>
              <CardTitle className="text-2xl text-yellow-500">{stats.review}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <XCircle className="h-3 w-3 text-red-500" />
                Failed
              </CardDescription>
              <CardTitle className="text-2xl text-red-500">{stats.failed}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                Pending
              </CardDescription>
              <CardTitle className="text-2xl text-muted-foreground">{stats.pending}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Attempts Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Attempts</CardTitle>
            <CardDescription>
              Verification attempts and their results from Woodwide bot detection
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Attempt ID</TableHead>
                    <TableHead>Deployment</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Started At</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead className="text-right">Anomaly Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!attempts ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Loading attempts...
                      </TableCell>
                    </TableRow>
                  ) : attempts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No verification attempts yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    attempts.map((attempt) => (
                      <TableRow key={attempt._id}>
                        <TableCell className="font-mono text-xs">
                          {attempt.attemptId.substring(0, 20)}...
                        </TableCell>
                        <TableCell>{attempt.deploymentName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{attempt.deploymentType}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatTime(attempt.createdAt)}
                        </TableCell>
                        <TableCell>{getResultBadge(attempt.result)}</TableCell>
                        <TableCell className="text-right font-mono">
                          {attempt.anomalyScore !== null
                            ? attempt.anomalyScore.toFixed(3)
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-start gap-4 text-sm text-muted-foreground">
              <div>
                <strong className="text-foreground">How it works:</strong> Each verification attempt streams
                pointer telemetry via LiveKit to Woodwide for bot detection scoring.
                The result (Pass/Review/Fail) is determined by Woodwide's anomaly detection model.
              </div>
              <div>
                <strong className="text-foreground">Privacy:</strong> Individual pointer movements are not displayed here.
                They are only sent to Woodwide for scoring and are not stored or visible to dashboard users.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
