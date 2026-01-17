"use client";

import { format } from "date-fns";
import { Gamepad2, Layers3, Sparkles } from "lucide-react";
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
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { api } from "@/convex/_generated/api";

export default function MinigamesPage() {
  const minigames = useQuery(api.minigames.list);
  const isLoading = minigames === undefined;

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

      {isLoading ? (
        <div className="text-sm text-muted-foreground">
          Loading minigames...
        </div>
      ) : minigames.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Gamepad2 className="size-5" />
            </EmptyMedia>
            <EmptyTitle>No minigames yet</EmptyTitle>
            <EmptyDescription>
              Create your first verification game to start collecting sessions.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm">Create minigame</Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {minigames.map((game) => {
            const sessionCount = game.sessionIds?.length ?? 0;
            const statusLabel = game.isReady ? "Ready" : "Draft";
            const brandingLabel = game.brandingType
              ? `${game.brandingType} branding`
              : "Default branding";
            return (
              <Card key={game._id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>{game.name}</span>
                    <Badge variant="secondary">{statusLabel}</Badge>
                  </CardTitle>
                  <CardDescription>{brandingLabel}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Sessions</span>
                    <span className="text-foreground">{sessionCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Last updated</span>
                    <span className="text-foreground">
                      {format(new Date(game.updatedAt), "MMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 rounded-full border px-2 py-1">
                      <Sparkles className="size-3" />
                      {game.isReady ? "Signals stable" : "Tuning in progress"}
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
            );
          })}
        </div>
      )}

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
