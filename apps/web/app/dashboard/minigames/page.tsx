import { Gamepad2, Layers3, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const games = [
  {
    name: "Orbital Drift",
    type: "Reflex",
    status: "Live",
    completion: 94,
  },
  {
    name: "Glyph Match",
    type: "Perception",
    status: "Live",
    completion: 88,
  },
  {
    name: "Signal Sprint",
    type: "Timing",
    status: "Draft",
    completion: 62,
  },
  {
    name: "Orbit Lab",
    type: "Logic",
    status: "Paused",
    completion: 51,
  },
];

export default function MinigamesPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Minigames</h1>
          <p className="text-sm text-muted-foreground">
            Manage your verification games and rollout stages.
          </p>
        </div>
        <Button size="sm">Create minigame</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {games.map((game) => (
          <Card key={game.name}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>{game.name}</span>
                <Badge variant="secondary">{game.status}</Badge>
              </CardTitle>
              <CardDescription>{game.type} challenge</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={game.completion}>
                <span className="text-sm font-medium">
                  Tuning progress
                </span>
                <span className="text-muted-foreground text-sm">
                  {game.completion}%
                </span>
              </Progress>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 rounded-full border px-2 py-1">
                  <Sparkles className="size-3" />
                  Signals stable
                </span>
              </div>
              <div className="flex items-center justify-between">
                <Button size="sm" variant="outline">
                  Edit
                </Button>
                <Button size="sm" variant="ghost">
                  Preview
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Experiment queue</CardTitle>
            <CardDescription>
              Rotate new games through your verification funnel.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {[
              "Magnet Maze",
              "Pulse Grid",
              "Echo Trails",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center justify-between rounded-lg border px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <Gamepad2 className="size-4 text-muted-foreground" />
                  <span className="text-sm">{item}</span>
                </div>
                <Button size="sm" variant="ghost">
                  Schedule
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Signals toolkit</CardTitle>
            <CardDescription>
              Recommended modules to increase detection depth.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Motion entropy", status: "Ready" },
              { label: "Micro-latency", status: "Beta" },
              { label: "Device cadence", status: "Beta" },
            ].map((module) => (
              <div
                key={module.label}
                className="flex items-center justify-between rounded-lg border px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <Layers3 className="size-4 text-muted-foreground" />
                  <span className="text-sm">{module.label}</span>
                </div>
                <Badge variant="outline">{module.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
