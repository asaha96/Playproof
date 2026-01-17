import { Palette, Type, Wand2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const colors = [
  { name: "Primary", className: "bg-primary" },
  { name: "Accent", className: "bg-accent" },
  { name: "Muted", className: "bg-muted" },
  { name: "Sidebar", className: "bg-sidebar" },
];

export default function BrandingPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Branding</h1>
          <p className="text-sm text-muted-foreground">
            Style the PlayProof widget and verification surfaces.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Theme: Studio</Badge>
          <Button size="sm" variant="outline">
            Preview changes
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="size-4" />
              Brand colors
            </CardTitle>
            <CardDescription>Applied across widgets and overlays.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {colors.map((color) => (
                <div key={color.name} className="rounded-lg border p-3">
                  <div
                    className={`h-16 rounded-md ${color.className}`}
                    aria-hidden="true"
                  />
                  <div className="mt-3 text-sm font-medium">{color.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Token linked
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Type className="size-4" />
              Typography
            </CardTitle>
            <CardDescription>Fonts used for prompts and labels.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border p-3">
              <div className="text-sm font-medium">Nunito Sans</div>
              <div className="text-xs text-muted-foreground">
                Headings and prompts
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-sm font-medium">Geist Mono</div>
              <div className="text-xs text-muted-foreground">
                Token labels and metrics
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="size-4" />
            Widget presets
          </CardTitle>
          <CardDescription>Quick presets for common placements.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {[
            {
              name: "Inline",
              description: "Embedded directly inside forms.",
            },
            {
              name: "Modal",
              description: "Full focus verification flow.",
            },
            {
              name: "Compact",
              description: "Low footprint for mobile screens.",
            },
          ].map((preset) => (
            <div key={preset.name} className="rounded-lg border p-4">
              <div className="text-sm font-medium">{preset.name}</div>
              <p className="text-xs text-muted-foreground">
                {preset.description}
              </p>
              <Button size="sm" variant="ghost" className="mt-3">
                Customize
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
