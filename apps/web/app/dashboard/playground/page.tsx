"use client"

import * as React from "react"
import { Gamepad2, RefreshCw, Palette, Monitor, Smartphone, CheckCircle2, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { PlayproofCaptcha, type PlayproofCaptchaResult } from "@/components/playproof-captcha"
import { Badge } from "@/components/ui/badge"

export default function PlaygroundPage() {
    const [config, setConfig] = React.useState({
        gameType: "bubble-pop" as "bubble-pop" | "archery" | "random",
        difficulty: "normal" as "easy" | "normal" | "hard",
        confidenceThreshold: 0.7,
        primaryColor: "#6366f1",
        secondaryColor: "#8b5cf6",
        backgroundColor: "#1e1e2e",
        surfaceColor: "#2a2a3e",
        textColor: "#f5f5f5",
        textMutedColor: "#a1a1aa",
        accentColor: "#22d3ee",
        successColor: "#10b981",
        errorColor: "#ef4444",
        borderColor: "#3f3f5a",
        borderRadius: 12,
        spacing: 10,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        timer: 10,
    })

    const [resetKey, setResetKey] = React.useState(0)
    const [lastResult, setLastResult] = React.useState<{
        type: "success" | "failure"
        result: PlayproofCaptchaResult
    } | null>(null)

    const handleSuccess = React.useCallback((result: PlayproofCaptchaResult) => {
        setLastResult({ type: "success", result })
    }, [])

    const handleFailure = React.useCallback((result: PlayproofCaptchaResult) => {
        setLastResult({ type: "failure", result })
    }, [])

    const handleReset = () => {
        setLastResult(null)
        setResetKey(k => k + 1)
    }

    return (
        <div className="flex h-[calc(100vh-4rem)] flex-col gap-6 p-6 md:grid md:grid-cols-[320px_1fr] md:gap-8 lg:grid-cols-[360px_1fr]">
            {/* Configuration Panel */}
            <div className="flex flex-col gap-5 overflow-y-auto pb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Playground</h1>
                    <p className="text-sm text-muted-foreground">
                        Test and customize captcha styles and behaviors.
                    </p>
                </div>

                {/* Game Configuration */}
                <Card className="border-0 shadow-none ring-0 bg-transparent">
                    <CardHeader className="pb-3 px-0">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Gamepad2 className="size-4" />
                            Game Settings
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 px-0">
                        <div className="space-y-2">
                            <Label className="text-xs font-medium">Game Type</Label>
                            <Select
                                value={config.gameType}
                                onValueChange={(v) => v && setConfig({ ...config, gameType: v as typeof config.gameType })}
                            >
                                <SelectTrigger className="h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="bubble-pop">Bubble Pop</SelectItem>
                                    <SelectItem value="archery">Archery</SelectItem>
                                    <SelectItem value="random">Random</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-medium">Difficulty</Label>
                            <Select
                                value={config.difficulty}
                                onValueChange={(v) => v && setConfig({ ...config, difficulty: v as typeof config.difficulty })}
                            >
                                <SelectTrigger className="h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="easy">Easy (15s)</SelectItem>
                                    <SelectItem value="normal">Normal (10s)</SelectItem>
                                    <SelectItem value="hard">Hard (6s)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-medium">
                                Timer Override ({config.timer}s)
                            </Label>
                            <Slider
                                value={[config.timer]}
                                min={5}
                                max={30}
                                step={1}
                                onValueChange={(v) => setConfig({ ...config, timer: Array.isArray(v) ? v[0] : v })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-medium">
                                Confidence Threshold ({(config.confidenceThreshold * 100).toFixed(0)}%)
                            </Label>
                            <Slider
                                value={[config.confidenceThreshold]}
                                min={0.3}
                                max={1}
                                step={0.05}
                                onValueChange={(v) => setConfig({ ...config, confidenceThreshold: Array.isArray(v) ? v[0] : v })}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Appearance */}
                <Card className="border-0 shadow-none ring-0 bg-transparent">
                    <CardHeader className="pb-3 px-0">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Palette className="size-4" />
                            Appearance
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 px-0">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Primary</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="color"
                                        className="w-10 p-1 h-8 shrink-0"
                                        value={config.primaryColor}
                                        onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                                    />
                                    <Input
                                        className="h-8 font-mono text-xs"
                                        value={config.primaryColor}
                                        onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Secondary</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="color"
                                        className="w-10 p-1 h-8 shrink-0"
                                        value={config.secondaryColor}
                                        onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
                                    />
                                    <Input
                                        className="h-8 font-mono text-xs"
                                        value={config.secondaryColor}
                                        onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Background</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="color"
                                        className="w-10 p-1 h-8 shrink-0"
                                        value={config.backgroundColor}
                                        onChange={(e) => setConfig({ ...config, backgroundColor: e.target.value })}
                                    />
                                    <Input
                                        className="h-8 font-mono text-xs"
                                        value={config.backgroundColor}
                                        onChange={(e) => setConfig({ ...config, backgroundColor: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Surface</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="color"
                                        className="w-10 p-1 h-8 shrink-0"
                                        value={config.surfaceColor}
                                        onChange={(e) => setConfig({ ...config, surfaceColor: e.target.value })}
                                    />
                                    <Input
                                        className="h-8 font-mono text-xs"
                                        value={config.surfaceColor}
                                        onChange={(e) => setConfig({ ...config, surfaceColor: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Text</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="color"
                                        className="w-10 p-1 h-8 shrink-0"
                                        value={config.textColor}
                                        onChange={(e) => setConfig({ ...config, textColor: e.target.value })}
                                    />
                                    <Input
                                        className="h-8 font-mono text-xs"
                                        value={config.textColor}
                                        onChange={(e) => setConfig({ ...config, textColor: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Text Muted</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="color"
                                        className="w-10 p-1 h-8 shrink-0"
                                        value={config.textMutedColor}
                                        onChange={(e) => setConfig({ ...config, textMutedColor: e.target.value })}
                                    />
                                    <Input
                                        className="h-8 font-mono text-xs"
                                        value={config.textMutedColor}
                                        onChange={(e) => setConfig({ ...config, textMutedColor: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Accent</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="color"
                                        className="w-10 p-1 h-8 shrink-0"
                                        value={config.accentColor}
                                        onChange={(e) => setConfig({ ...config, accentColor: e.target.value })}
                                    />
                                    <Input
                                        className="h-8 font-mono text-xs"
                                        value={config.accentColor}
                                        onChange={(e) => setConfig({ ...config, accentColor: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Success</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="color"
                                        className="w-10 p-1 h-8 shrink-0"
                                        value={config.successColor}
                                        onChange={(e) => setConfig({ ...config, successColor: e.target.value })}
                                    />
                                    <Input
                                        className="h-8 font-mono text-xs"
                                        value={config.successColor}
                                        onChange={(e) => setConfig({ ...config, successColor: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Error</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="color"
                                        className="w-10 p-1 h-8 shrink-0"
                                        value={config.errorColor}
                                        onChange={(e) => setConfig({ ...config, errorColor: e.target.value })}
                                    />
                                    <Input
                                        className="h-8 font-mono text-xs"
                                        value={config.errorColor}
                                        onChange={(e) => setConfig({ ...config, errorColor: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Border</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="color"
                                        className="w-10 p-1 h-8 shrink-0"
                                        value={config.borderColor}
                                        onChange={(e) => setConfig({ ...config, borderColor: e.target.value })}
                                    />
                                    <Input
                                        className="h-8 font-mono text-xs"
                                        value={config.borderColor}
                                        onChange={(e) => setConfig({ ...config, borderColor: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 pt-2">
                            <Label className="text-xs font-medium">Border Radius ({config.borderRadius}px)</Label>
                            <Slider
                                value={[config.borderRadius]}
                                max={24}
                                step={1}
                                onValueChange={(v) => setConfig({ ...config, borderRadius: Array.isArray(v) ? v[0] : v })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-medium">Spacing ({config.spacing}px)</Label>
                            <Slider
                                value={[config.spacing]}
                                max={40}
                                step={2}
                                onValueChange={(v) => setConfig({ ...config, spacing: Array.isArray(v) ? v[0] : v })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-medium">Font Family</Label>
                            <Input
                                className="h-8 text-xs"
                                value={config.fontFamily}
                                onChange={(e) => setConfig({ ...config, fontFamily: e.target.value })}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Result Display */}
                {lastResult && (
                    <Card className={lastResult.type === "success" ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}>
                        <CardContent className="pt-4">
                            <div className="flex items-center gap-3">
                                {lastResult.type === "success" ? (
                                    <CheckCircle2 className="size-5 text-green-500" />
                                ) : (
                                    <XCircle className="size-5 text-red-500" />
                                )}
                                <div className="flex-1">
                                    <p className={`text-sm font-medium ${lastResult.type === "success" ? "text-green-500" : "text-red-500"}`}>
                                        {lastResult.type === "success" ? "Verification Passed" : "Verification Failed"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Score: {(lastResult.result.score * 100).toFixed(1)}% | Threshold: {(lastResult.result.threshold * 100).toFixed(0)}%
                                    </p>
                                </div>
                                <Badge variant={lastResult.type === "success" ? "default" : "destructive"}>
                                    {lastResult.result.passed ? "PASS" : "FAIL"}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Preview Panel */}
            <div className="flex flex-col gap-4 h-full">
                <Tabs defaultValue="desktop" className="flex-1 flex flex-col">
                    <div className="flex items-center justify-between pb-4">
                        <TabsList>
                            <TabsTrigger value="desktop"><Monitor className="size-4 mr-2" /> Desktop</TabsTrigger>
                            <TabsTrigger value="mobile"><Smartphone className="size-4 mr-2" /> Mobile</TabsTrigger>
                        </TabsList>
                        <Button variant="outline" size="sm" onClick={handleReset}>
                            <RefreshCw className="size-3 mr-2" />
                            Reset
                        </Button>
                    </div>

                    <div className="flex-1 rounded-xl border bg-muted/30 p-8 flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-grid-slate-200/50 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25 pointer-events-none" />

                        <TabsContent value="desktop" className="m-0 w-full max-w-[420px] rounded-2xl overflow-hidden mt-0">
                            <PlayproofCaptcha
                                key={`desktop-${resetKey}`}
                                resetKey={resetKey}
                                confidenceThreshold={config.confidenceThreshold}
                                gameType={config.gameType}
                                difficulty={config.difficulty}
                                timer={config.timer}
                                borderRadius={config.borderRadius}
                                primaryColor={config.primaryColor}
                                secondaryColor={config.secondaryColor}
                                backgroundColor={config.backgroundColor}
                                surfaceColor={config.surfaceColor}
                                textColor={config.textColor}
                                textMutedColor={config.textMutedColor}
                                accentColor={config.accentColor}
                                successColor={config.successColor}
                                errorColor={config.errorColor}
                                borderColor={config.borderColor}
                                spacing={config.spacing}
                                fontFamily={config.fontFamily}
                                onSuccess={handleSuccess}
                                onFailure={handleFailure}
                            />
                        </TabsContent>

                        <TabsContent value="mobile" className="m-0 w-[320px] rounded-2xl overflow-hidden mt-0">
                            <PlayproofCaptcha
                                key={`mobile-${resetKey}`}
                                resetKey={resetKey}
                                confidenceThreshold={config.confidenceThreshold}
                                gameType={config.gameType}
                                difficulty={config.difficulty}
                                timer={config.timer}
                                borderRadius={config.borderRadius}
                                primaryColor={config.primaryColor}
                                secondaryColor={config.secondaryColor}
                                backgroundColor={config.backgroundColor}
                                surfaceColor={config.surfaceColor}
                                textColor={config.textColor}
                                textMutedColor={config.textMutedColor}
                                accentColor={config.accentColor}
                                successColor={config.successColor}
                                errorColor={config.errorColor}
                                borderColor={config.borderColor}
                                spacing={config.spacing}
                                fontFamily={config.fontFamily}
                                onSuccess={handleSuccess}
                                onFailure={handleFailure}
                            />
                        </TabsContent>
                    </div>
                </Tabs>


            </div>
        </div>
    )
}
