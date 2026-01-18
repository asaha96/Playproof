"use client";

import { ShieldCheck, Sparkles, Target, TrendingUp, Bot, UserCheck } from "lucide-react";
import { useQuery } from "convex/react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

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
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { api } from "@/convex/_generated/api";

export default function AnalyticsPage() {
  const stats = useQuery(api.sessions.stats);
  const sessions = useQuery(api.sessions.recent, { limit: 10 });
  const timeSeriesData = useQuery(api.sessions.timeSeries, { hours: 24 });

  const statCards = stats
    ? [
      {
        label: "Human pass rate",
        value: `${(stats.humanPassRate * 100).toFixed(1)}%`,
        note: `${stats.totalSessions} sessions`,
        icon: UserCheck,
        trend: stats.humanPassRate > 0.8 ? "positive" : "neutral",
      },
      {
        label: "Bot detections",
        value: stats.botDetections.toLocaleString(),
        note: `of ${stats.totalSessions} sessions`,
        icon: Bot,
        trend: stats.botDetections < stats.totalSessions * 0.1 ? "positive" : "neutral",
      },
      {
        label: "Avg. session time",
        value: `${(stats.avgSessionMs / 1000).toFixed(1)}s`,
        note: `${stats.totalSessions} sessions`,
        icon: TrendingUp,
        trend: stats.avgSessionMs < 5000 ? "positive" : "neutral",
      },
      {
        label: "Completion rate",
        value: `${((stats.completionRate ?? 0) * 100).toFixed(1)}%`,
        note: `${stats.totalSessions} sessions`,
        icon: Target,
        trend: (stats.completionRate ?? 0) > 0.9 ? "positive" : "neutral",
      },
    ]
    : [
      { label: "Human pass rate", value: "--", note: "Loading sessions", icon: UserCheck },
      { label: "Bot detections", value: "--", note: "Loading sessions", icon: Bot },
      {
        label: "Avg. session time",
        value: "--",
        note: "Loading sessions",
        icon: TrendingUp,
      },
      {
        label: "Completion rate",
        value: "--",
        note: "Loading sessions",
        icon: Target,
      },
    ];

  const formatSessionId = (id: string) => {
    if (id.length <= 8) {
      return id;
    }
    return `${id.slice(0, 4)}...${id.slice(-4)}`;
  };

  // Prepare time series chart data (hourly for last 24 hours)
  const chartData = timeSeriesData
    ? timeSeriesData.map((hour) => {
      // Parse ISO string like "2026-01-18T07" to get hour
      const date = new Date(hour.date + ":00:00Z");
      return {
        date: date.toLocaleTimeString("en-US", { hour: "numeric", hour12: true }),
        humans: hour.humans,
        bots: hour.bots,
        passRate: hour.total > 0 ? (hour.humans / hour.total) * 100 : 0,
      };
    })
    : [];

  // Prepare deployment breakdown data
  const deploymentBreakdown = stats && 'byDeployment' in stats && stats.byDeployment
    ? Object.entries(stats.byDeployment as Record<string, { count: number; passRate: number }>).map(([deploymentId, data]) => ({
      deployment: deploymentId.slice(-8),
      passRate: data.passRate * 100,
      count: data.count,
    }))
    : [];

  const chartConfig = {
    humans: {
      label: "Humans",
      theme: {
        light: "hsl(var(--chart-1))",
        dark: "hsl(var(--chart-1))",
      },
    },
    bots: {
      label: "Bots",
      theme: {
        light: "hsl(var(--chart-2))",
        dark: "hsl(var(--chart-2))",
      },
    },
    passRate: {
      label: "Pass Rate",
      theme: {
        light: "hsl(var(--chart-3))",
        dark: "hsl(var(--chart-3))",
      },
    },
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
          <Badge variant="secondary">Last 24 hours</Badge>
          <Button size="sm" variant="outline">
            Export
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription>{stat.label}</CardDescription>
              {stat.icon && <stat.icon className="h-4 w-4 text-muted-foreground" />}
            </CardHeader>
            <CardContent>
              <CardTitle className="text-2xl">{stat.value}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">{stat.note}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Verification trends</CardTitle>
            <CardDescription>
              Human vs bot detection over the last 24 hours.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0">
            {chartData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center rounded-lg border border-dashed bg-muted/30 min-h-[400px]">
                <div className="text-center text-sm text-muted-foreground">
                  <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No data yet</p>
                  <p className="text-xs">Sessions will appear here once deployments start running</p>
                </div>
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="flex-1 min-h-[400px] w-full">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    className="text-xs"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    className="text-xs"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="humans"
                    stroke="var(--color-humans)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="bots"
                    stroke="var(--color-bots)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            )}
            <div className="flex flex-wrap gap-2 mt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1">
                <ShieldCheck className="size-3" />
                Low spoof variance
              </span>
              <span className="flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1">
                <Sparkles className="size-3" />
                Smooth interaction curves
              </span>
              <span className="flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1">
                <Target className="size-3" />
                Stable completion rate
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Detection summary</CardTitle>
            <CardDescription>Session outcomes overview.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!stats ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Loading...</p>
              </div>
            ) : stats.totalSessions === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No sessions yet</p>
                <p className="text-xs">Data will appear once sessions are recorded</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 hover:bg-muted/50 transition-colors">
                  <span className="text-sm flex items-center gap-2">
                    <UserCheck className="size-4 text-green-500" />
                    Humans verified
                  </span>
                  <span className="text-sm font-medium">{stats.totalSessions - stats.botDetections}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 hover:bg-muted/50 transition-colors">
                  <span className="text-sm flex items-center gap-2">
                    <Bot className="size-4 text-red-500" />
                    Bots detected
                  </span>
                  <span className="text-sm font-medium">{stats.botDetections}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 hover:bg-muted/50 transition-colors">
                  <span className="text-sm flex items-center gap-2">
                    <TrendingUp className="size-4 text-blue-500" />
                    Avg. duration
                  </span>
                  <span className="text-sm font-medium">{(stats.avgSessionMs / 1000).toFixed(1)}s</span>
                </div>
              </>
            )}
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
                    <TableCell>
                      <span className="font-mono">{session.scorePercent}%</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={session.result === "Human" ? "default" : "destructive"}
                        className="gap-1"
                      >
                        {session.result === "Human" ? (
                          <UserCheck className="size-3" />
                        ) : (
                          <Bot className="size-3" />
                        )}
                        {session.result}
                      </Badge>
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
