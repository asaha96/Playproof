"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  Gamepad2,
  Palette,
  Type,
  RefreshCw,
  Monitor,
  Smartphone,
  CheckCircle2,
  XCircle,
  Settings2,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  PlayproofCaptcha,
  type PlayproofCaptchaResult,
} from "@/components/playproof-captcha";
import { api } from "@/convex/_generated/api";
import { useThemeColors, LIGHT_THEME_COLORS, PLAYPROOF_FONTS, type PlayproofFontFamily } from "@/hooks/useThemeColors";
import type { Id } from "@/convex/_generated/dataModel";

type DeploymentType = "bubble-pop" | "snake";

const deploymentTypes: Array<{ value: DeploymentType; label: string }> = [
  { value: "bubble-pop", label: "Bubble Pop" },
  { value: "snake", label: "Snake" },
];

type ColorFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function ColorField({ id, label, value, onChange }: ColorFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      <div className="flex gap-2">
        <Input
          id={`${id}-picker`}
          type="color"
          className="w-10 p-1 h-8 shrink-0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <Input
          id={id}
          className="h-8 font-mono text-xs"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

export default function EditDeploymentPage() {
  const router = useRouter();
  const params = useParams();
  const deploymentId = params.deployment_id as Id<"deployments">;

  const deployment = useQuery(api.deployments.get, { id: deploymentId });
  const updateDeployment = useMutation(api.deployments.update);
  const themeColors = useThemeColors();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isInitialized, setIsInitialized] = React.useState(false);

  // Form state - start with light theme defaults (Inter as default font)
  const [formState, setFormState] = React.useState({
    name: "",
    type: "bubble-pop" as DeploymentType,
    isActive: true,
    ...LIGHT_THEME_COLORS,
  });

  // Initialize form with deployment data, using theme colors as fallback for unset values
  React.useEffect(() => {
    if (deployment && !isInitialized) {
      // Use current theme colors or fall back to light theme
      const colors = themeColors ?? LIGHT_THEME_COLORS;
      setFormState({
        name: deployment.name,
        type: deployment.type as DeploymentType,
        isActive: deployment.isActive,
        fontFamily: (deployment.typography as PlayproofFontFamily) ?? colors.fontFamily,
        borderRadius: deployment.borderRadius ?? colors.borderRadius,
        spacing: deployment.spacing ?? colors.spacing,
        primaryColor: deployment.primaryColor ?? colors.primaryColor,
        secondaryColor: deployment.secondaryColor ?? colors.secondaryColor,
        backgroundColor: deployment.backgroundColor ?? colors.backgroundColor,
        surfaceColor: deployment.surfaceColor ?? colors.surfaceColor,
        textColor: deployment.textColor ?? colors.textColor,
        textMutedColor: deployment.textMutedColor ?? colors.textMutedColor,
        accentColor: deployment.accentColor ?? colors.accentColor,
        successColor: deployment.successColor ?? colors.successColor,
        errorColor: deployment.errorColor ?? colors.errorColor,
        borderColor: deployment.borderColor ?? colors.borderColor,
      });
      setIsInitialized(true);
    }
  }, [deployment, isInitialized, themeColors]);

  // Preview state
  const [resetKey, setResetKey] = React.useState(0);
  const [lastResult, setLastResult] = React.useState<{
    type: "success" | "failure";
    result: PlayproofCaptchaResult;
  } | null>(null);

  const handleSuccess = React.useCallback((result: PlayproofCaptchaResult) => {
    setLastResult({ type: "success", result });
  }, []);

  const handleFailure = React.useCallback((result: PlayproofCaptchaResult) => {
    setLastResult({ type: "failure", result });
  }, []);

  const handleReset = () => {
    setLastResult(null);
    setResetKey((k) => k + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await updateDeployment({
        id: deploymentId,
        name: formState.name.trim(),
        type: formState.type,
        isActive: formState.isActive,
        branding: {
          primaryColor: formState.primaryColor,
          secondaryColor: formState.secondaryColor,
          backgroundColor: formState.backgroundColor,
          surfaceColor: formState.surfaceColor,
          textColor: formState.textColor,
          textMutedColor: formState.textMutedColor,
          accentColor: formState.accentColor,
          successColor: formState.successColor,
          errorColor: formState.errorColor,
          borderColor: formState.borderColor,
          borderRadius: formState.borderRadius,
          spacing: formState.spacing,
          typography: formState.fontFamily,
        },
      });
      router.push("/dashboard/deployments");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Map deployment type to game type for preview
  const getGameType = (type: DeploymentType): "bubble-pop" | "archery" => {
    if (type === "archery") return "archery";
    return "bubble-pop";
  };

  // Loading state
  if (deployment === undefined) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          <span>Loading deployment...</span>
        </div>
      </div>
    );
  }

  // Not found state
  if (deployment === null) {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Deployment Not Found</h1>
        <p className="text-muted-foreground">
          The deployment you&apos;re looking for doesn&apos;t exist.
        </p>
        <Button nativeButton={false} render={<Link href="/dashboard/deployments" />}>
          Back to Deployments
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col p-6 lg:grid lg:grid-cols-[400px_1fr]">
      {/* Form Panel */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-5 overflow-y-auto p-6"
      >
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            nativeButton={false}
            render={<Link href="/dashboard/deployments" />}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Edit Deployment
            </h1>
            <p className="text-sm text-muted-foreground">
              Update your verification experience.
            </p>
          </div>
        </div>

        {/* Basic Settings */}
        <Card className="overflow-visible ring-0">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings2 className="size-4" />
              Basic Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Deployment Name</Label>
              <Input
                placeholder="e.g. Summer Launch"
                value={formState.name}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Type</Label>
                <Select
                  value={formState.type}
                  onValueChange={(v) =>
                    v &&
                    setFormState((prev) => ({
                      ...prev,
                      type: v as DeploymentType,
                    }))
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue>
                      {deploymentTypes.find((t) => t.value === formState.type)?.label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {deploymentTypes.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Status</Label>
                <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 h-9">
                  <span className="text-xs">Active</span>
                  <Switch
                    checked={formState.isActive}
                    onCheckedChange={(checked) =>
                      setFormState((prev) => ({ ...prev, isActive: checked }))
                    }
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Typography */}
        <Card className="overflow-visible ring-0">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Type className="size-4" />
              Layout & Typography
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Font Family</Label>
              <Select
                value={formState.fontFamily}
                onValueChange={(v) =>
                  v && setFormState((prev) => ({ ...prev, fontFamily: v as PlayproofFontFamily }))
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAYPROOF_FONTS.map((font) => (
                    <SelectItem key={font} value={font}>
                      {font}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Border Radius</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={32}
                    className="h-9"
                    value={formState.borderRadius}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        borderRadius: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                  <span className="text-xs text-muted-foreground">px</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Spacing</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={32}
                    className="h-9"
                    value={formState.spacing}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        spacing: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                  <span className="text-xs text-muted-foreground">px</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Core Colors */}
        <Card className="overflow-visible ring-0">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="size-4" />
              Core Colors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <ColorField
                id="primary-color"
                label="Primary"
                value={formState.primaryColor}
                onChange={(v) =>
                  setFormState((prev) => ({ ...prev, primaryColor: v }))
                }
              />
              <ColorField
                id="secondary-color"
                label="Secondary"
                value={formState.secondaryColor}
                onChange={(v) =>
                  setFormState((prev) => ({ ...prev, secondaryColor: v }))
                }
              />
              <ColorField
                id="background-color"
                label="Background"
                value={formState.backgroundColor}
                onChange={(v) =>
                  setFormState((prev) => ({ ...prev, backgroundColor: v }))
                }
              />
              <ColorField
                id="surface-color"
                label="Surface"
                value={formState.surfaceColor}
                onChange={(v) =>
                  setFormState((prev) => ({ ...prev, surfaceColor: v }))
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Text Colors */}
        <Card className="overflow-visible ring-0">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Type className="size-4" />
              Text Colors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <ColorField
                id="text-color"
                label="Text"
                value={formState.textColor}
                onChange={(v) =>
                  setFormState((prev) => ({ ...prev, textColor: v }))
                }
              />
              <ColorField
                id="text-muted-color"
                label="Text Muted"
                value={formState.textMutedColor}
                onChange={(v) =>
                  setFormState((prev) => ({ ...prev, textMutedColor: v }))
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* UI Colors */}
        <Card className="overflow-visible ring-0">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Gamepad2 className="size-4" />
              UI Colors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <ColorField
                id="accent-color"
                label="Accent"
                value={formState.accentColor}
                onChange={(v) =>
                  setFormState((prev) => ({ ...prev, accentColor: v }))
                }
              />
              <ColorField
                id="success-color"
                label="Success"
                value={formState.successColor}
                onChange={(v) =>
                  setFormState((prev) => ({ ...prev, successColor: v }))
                }
              />
              <ColorField
                id="error-color"
                label="Error"
                value={formState.errorColor}
                onChange={(v) =>
                  setFormState((prev) => ({ ...prev, errorColor: v }))
                }
              />
              <ColorField
                id="border-color"
                label="Border"
                value={formState.borderColor}
                onChange={(v) =>
                  setFormState((prev) => ({ ...prev, borderColor: v }))
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Result Display */}
        {lastResult && (
          <Card
            className={
              lastResult.type === "success"
                ? "border-green-500/30 bg-green-500/5"
                : "border-red-500/30 bg-red-500/5"
            }
          >
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                {lastResult.type === "success" ? (
                  <CheckCircle2 className="size-5 text-green-500" />
                ) : (
                  <XCircle className="size-5 text-red-500" />
                )}
                <div className="flex-1">
                  <p
                    className={`text-sm font-medium ${lastResult.type === "success" ? "text-green-500" : "text-red-500"}`}
                  >
                    {lastResult.type === "success"
                      ? "Verification Passed"
                      : "Verification Failed"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Score: {(lastResult.result.score * 100).toFixed(1)}% |
                    Threshold:{" "}
                    {(lastResult.result.threshold * 100).toFixed(0)}%
                  </p>
                </div>
                <Badge
                  variant={
                    lastResult.type === "success" ? "default" : "destructive"
                  }
                >
                  {lastResult.result.passed ? "PASS" : "FAIL"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            nativeButton={false}
            render={<Link href="/dashboard/deployments" />}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={isSubmitting || !formState.name.trim()}
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>

      {/* Preview Panel */}
      <div className="hidden lg:flex flex-col gap-4">
        <Tabs defaultValue="desktop" className="flex-1 flex flex-col">
          <div className="flex items-center justify-between pb-4">
            <TabsList>
              <TabsTrigger value="desktop">
                <Monitor className="size-4 mr-2" /> Desktop
              </TabsTrigger>
              <TabsTrigger value="mobile">
                <Smartphone className="size-4 mr-2" /> Mobile
              </TabsTrigger>
            </TabsList>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RefreshCw className="size-3 mr-2" />
              Reset
            </Button>
          </div>

          <div className="flex-1 rounded-xl border bg-muted/30 p-8 flex items-center justify-center relative">
            <div className="absolute inset-0 bg-grid-slate-200/50 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25 pointer-events-none" />

            <TabsContent
              value="desktop"
              className="m-0 w-full max-w-[420px] rounded-2xl mt-0"
            >
              <PlayproofCaptcha
                key={`desktop-${resetKey}`}
                resetKey={resetKey}
                gameType={getGameType(formState.type)}
                borderRadius={formState.borderRadius}
                spacing={formState.spacing}
                fontFamily={formState.fontFamily}
                primaryColor={formState.primaryColor}
                secondaryColor={formState.secondaryColor}
                backgroundColor={formState.backgroundColor}
                surfaceColor={formState.surfaceColor}
                textColor={formState.textColor}
                textMutedColor={formState.textMutedColor}
                accentColor={formState.accentColor}
                successColor={formState.successColor}
                errorColor={formState.errorColor}
                borderColor={formState.borderColor}
                onSuccess={handleSuccess}
                onFailure={handleFailure}
              />
            </TabsContent>

            <TabsContent
              value="mobile"
              className="m-0 w-[320px] rounded-2xl mt-0"
            >
              <PlayproofCaptcha
                key={`mobile-${resetKey}`}
                resetKey={resetKey}
                gameType={getGameType(formState.type)}
                borderRadius={formState.borderRadius}
                spacing={formState.spacing}
                fontFamily={formState.fontFamily}
                primaryColor={formState.primaryColor}
                secondaryColor={formState.secondaryColor}
                backgroundColor={formState.backgroundColor}
                surfaceColor={formState.surfaceColor}
                textColor={formState.textColor}
                textMutedColor={formState.textMutedColor}
                accentColor={formState.accentColor}
                successColor={formState.successColor}
                errorColor={formState.errorColor}
                borderColor={formState.borderColor}
                onSuccess={handleSuccess}
                onFailure={handleFailure}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
