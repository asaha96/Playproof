import { ArrowUpRight, ShieldCheck, Sparkles, Target } from "lucide-react";

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

const stats = [
  {
    label: "Human pass rate",
    value: "97.2%",
    delta: "+1.4%",
  },
  {
    label: "Bot detections",
    value: "1,142",
    delta: "+8.1%",
  },
  {
    label: "Avg. session time",
    value: "14.8s",
    delta: "-0.9s",
  },
];

const sessions = [
  {
    id: "pp-9012",
    game: "Orbital Drift",
    score: "98",
    result: "Human",
  },
  {
    id: "pp-9011",
    game: "Glyph Match",
    score: "83",
    result: "Human",
  },
  {
    id: "pp-9010",
    game: "Signal Sprint",
    score: "42",
    result: "Bot",
  },
  {
    id: "pp-9009",
    game: "Orbit Lab",
    score: "76",
    result: "Human",
  },
];

export default function AnalyticsPage() {
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
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-2xl">{stat.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                Trend: <span className="text-foreground">{stat.delta}</span>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>Game</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Result</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="font-medium">{session.id}</TableCell>
                  <TableCell>{session.game}</TableCell>
                  <TableCell>{session.score}</TableCell>
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
        </CardContent>
      </Card>
    </div>
  );
}
