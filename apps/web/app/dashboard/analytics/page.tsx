"use client";

import { ArrowUpRight, ShieldCheck, Sparkles, Target } from "lucide-react";
import { useQuery } from "convex/react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { api } from "@/convex/_generated/api";

export default function AnalyticsPage() {
  const stats = useQuery(api.sessions.stats);
  const sessions = useQuery(api.sessions.recent, { limit: 6 });

  const statCards = stats
    ? [
        {
          label: "Human pass rate",
          value: `${(stats.humanPassRate * 100).toFixed(1)}%`,
          note: `${stats.totalSessions} sessions`,
        },
        {
          label: "Bot detections",
          value: stats.botDetections.toLocaleString(),
          note: `of ${stats.totalSessions} sessions`,
        },
        {
          label: "Avg. session time",
          value: `${(stats.avgSessionMs / 1000).toFixed(1)}s`,
          note: `${stats.totalSessions} sessions`,
        },
      ]
    : [
        { label: "Human pass rate", value: "--", note: "Loading sessions" },
        { label: "Bot detections", value: "--", note: "Loading sessions" },
        {
          label: "Avg. session time",
          value: "--",
          note: "Loading sessions",
        },
      ];

  const formatSessionId = (id: string) => {
    if (id.length <= 8) {
      return id;
    }
    return `${id.slice(0, 4)}...${id.slice(-4)}`;
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Verification performance and signal health for your deployment.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Last 14 days</Badge>
          <Button size="sm" variant="outline">
            Export
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-2xl">{stat.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                <span className="text-foreground">{stat.note}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Signal stability</CardTitle>
            <CardDescription>
              Consistent human patterns across geography and device types.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="h-48 rounded-lg border border-dashed bg-gradient-to-br from-primary/10 via-transparent to-muted" />
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 rounded-full border px-2 py-1">
                  <ShieldCheck className="size-3" />
                  Low spoof variance
                </span>
                <span className="flex items-center gap-1 rounded-full border px-2 py-1">
                  <Sparkles className="size-3" />
                  Smooth interaction curves
                </span>
                <span className="flex items-center gap-1 rounded-full border px-2 py-1">
                  <Target className="size-3" />
                  Stable completion rate
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top risk signals</CardTitle>
            <CardDescription>Patterns that triggered bot reviews.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Repeat latency spikes", value: "18%" },
              { label: "Synthetic cursor arcs", value: "12%" },
              { label: "Viewport cloning", value: "9%" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-lg border px-3 py-2"
              >
                <span className="text-sm">{item.label}</span>
                <span className="text-sm font-medium">{item.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent sessions</CardTitle>
          <CardDescription>Latest verification outcomes.</CardDescription>
        </CardHeader>
        <CardContent>
          {sessions === undefined ? (
            <div className="text-sm text-muted-foreground">
              Loading sessions...
            </div>
          ) : sessions.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ShieldCheck className="size-5" />
                </EmptyMedia>
                <EmptyTitle>No sessions yet</EmptyTitle>
                <EmptyDescription>
                  Sessions will appear here as soon as deployments go live.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session</TableHead>
                  <TableHead>Deployment</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session._id}>
                    <TableCell className="font-medium">
                      {formatSessionId(session._id)}
                    </TableCell>
                    <TableCell>{session.deploymentName}</TableCell>
                    <TableCell>{session.scorePercent}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-sm">
                        {session.result}
                        <ArrowUpRight className="size-3 text-muted-foreground" />
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
