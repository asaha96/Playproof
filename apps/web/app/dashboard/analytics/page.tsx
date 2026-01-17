"use client";

import { ArrowUpRight, ShieldCheck, Sparkles, Target, TrendingUp, Bot, UserCheck } from "lucide-react";
import { useQuery } from "convex/react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

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
  // @ts-expect-error - timeSeries will be available after Convex generates types
  const timeSeriesData = useQuery(api.sessions.timeSeries, { days: 14 });

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

  // Prepare time series chart data
  const chartData = timeSeriesData
    ? (timeSeriesData as Array<{ date: string; humans: number; bots: number; total: number }>).map((day) => ({
        date: new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        humans: day.humans,
        bots: day.bots,
        passRate: day.total > 0 ? (day.humans / day.total) * 100 : 0,
      }))
    : [];

  // Prepare game breakdown data
  const gameBreakdown = stats && 'byGame' in stats && stats.byGame
    ? Object.entries(stats.byGame as Record<string, { count: number; passRate: number }>).map(([gameId, data]) => ({
        game: gameId.charAt(0).toUpperCase() + gameId.slice(1).replace("-", " "),
        passRate: data.passRate * 100,
        count: data.count,
      }))
    : [];

  // Top risk flags
  const topRiskFlags = stats && 'riskFlags' in stats && stats.riskFlags
    ? Object.entries(stats.riskFlags as Record<string, number>)
        .map(([flag, count]) => ({
          label: flag.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
          value: `${((count / (stats.totalSessions || 1)) * 100).toFixed(1)}%`,
          count: count as number,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
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
          <Badge variant="secondary">Last 14 days</Badge>
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
        <Card>
          <CardHeader>
            <CardTitle>Verification trends</CardTitle>
            <CardDescription>
              Human vs bot detection over the last 14 days.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center rounded-lg border border-dashed bg-muted/30">
                <div className="text-center text-sm text-muted-foreground">
                  <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No data yet</p>
                  <p className="text-xs">Sessions will appear here once games start running</p>
                </div>
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-64">
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
            <CardTitle>Top risk signals</CardTitle>
            <CardDescription>Patterns that triggered bot reviews.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topRiskFlags.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No risk flags detected</p>
                <p className="text-xs">All sessions appear legitimate</p>
              </div>
            ) : (
              topRiskFlags.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 hover:bg-muted/50 transition-colors"
                >
                  <span className="text-sm">{item.label}</span>
                  <span className="text-sm font-medium">{item.value}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {gameBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance by game</CardTitle>
            <CardDescription>Human pass rate across different minigames.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-64">
              <BarChart data={gameBreakdown}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="game"
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
                  domain={[0, 100]}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="passRate"
                  fill="var(--color-passRate)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

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
                  Sessions will appear here as soon as minigames start running.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session</TableHead>
                    <TableHead>Game</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Risk Flags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session._id}>
                      <TableCell className="font-medium">
                        {formatSessionId(session._id)}
                      </TableCell>
                      <TableCell className="capitalize">
                        {(session as any).gameId?.replace("-", " ") || session.minigameName}
                      </TableCell>
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
                      <TableCell>
                        {(session as any).riskFlags && Array.isArray((session as any).riskFlags) && (session as any).riskFlags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {((session as any).riskFlags as string[]).slice(0, 2).map((flag: string) => (
                              <Badge
                                key={flag}
                                variant="outline"
                                className="text-xs"
                              >
                                {flag.replace(/_/g, " ")}
                              </Badge>
                            ))}
                            {(session as any).riskFlags.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{(session as any).riskFlags.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
