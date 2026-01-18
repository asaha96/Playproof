"use client"

import * as React from "react"
import { Gamepad2, Play, RefreshCw, Palette, Layers, Monitor, Smartphone, Tablet } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
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
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"

export default function PlaygroundPage() {
    const [config, setConfig] = React.useState({
        type: "bubble-pop",
        difficulty: "normal",
        primaryColor: "#6366f1",
        secondaryColor: "#8b5cf6",
        backgroundColor: "#1e1e2e",
        surfaceColor: "#2a2a3e",
        textColor: "#f5f5f5",
        borderRadius: 12,
        showTimer: true,
    })

    const [isPlaying, setIsPlaying] = React.useState(false)
    const [progress, setProgress] = React.useState(0)

    // Simulation of game start
    const handleStart = () => {
        setIsPlaying(true)
        setProgress(0)
        // Simulate game loop
        const interval = setInterval(() => {
            setProgress(p => {
                if (p >= 100) {
                    clearInterval(interval)
                    // setIsPlaying(false) // Keep playing state to show end screen?
                    return 100
                }
                return p + 2
            })
        }, 100)
        setTimeout(() => {
            clearInterval(interval)
            setIsPlaying(false)
            setProgress(0)
        }, 5000)
    }

    return (
        <div className="flex h-[calc(100vh-4rem)] flex-col gap-6 p-6 md:grid md:grid-cols-[300px_1fr] md:gap-8 lg:grid-cols-[350px_1fr]">
            <div className="flex flex-col gap-6 overflow-y-auto pb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Playground</h1>
                    <p className="text-sm text-muted-foreground">
                        Test and customize captcha styles and behaviors.
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Gamepad2 className="size-4" />
                            Game Configuration
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Game Type</Label>
                            <Select
                                value={config.type}
                                onValueChange={(v) => v && setConfig({ ...config, type: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="bubble-pop">Bubble Pop</SelectItem>
                                    <SelectItem value="match-card">Card Match</SelectItem>
                                    <SelectItem value="slider">Slider Puzzle</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Difficulty</Label>
                            <Select
                                value={config.difficulty}
                                onValueChange={(v) => v && setConfig({ ...config, difficulty: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="easy">Easy</SelectItem>
                                    <SelectItem value="normal">Normal</SelectItem>
                                    <SelectItem value="hard">Hard</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center justify-between">
                            <Label>Show Timer</Label>
                            <Switch
                                checked={config.showTimer}
                                onCheckedChange={(c) => setConfig({ ...config, showTimer: c })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Border Radius ({config.borderRadius}px)</Label>
                            <Slider
                                value={[config.borderRadius]}
                                max={24}
                                step={1}
                                onValueChange={(v) => {
                                    const val = Array.isArray(v) ? v[0] : v;
                                    setConfig({ ...config, borderRadius: Number(val) })
                                }}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Palette className="size-4" />
                            Appearance
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Primary</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="color"
                                        className="w-12 p-1 h-8"
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
                            <div className="space-y-2">
                                <Label>Secondary</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="color"
                                        className="w-12 p-1 h-8"
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
                            <div className="space-y-2">
                                <Label>Background</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="color"
                                        className="w-12 p-1 h-8"
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
                            <div className="space-y-2">
                                <Label>Surface</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="color"
                                        className="w-12 p-1 h-8"
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
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-col gap-4">
                <Tabs defaultValue="desktop" className="flex-1 flex flex-col">
                    <div className="flex items-center justify-between pb-4">
                        <TabsList>
                            <TabsTrigger value="desktop"><Monitor className="size-4 mr-2" /> Desktop</TabsTrigger>
                            <TabsTrigger value="mobile"><Smartphone className="size-4 mr-2" /> Mobile</TabsTrigger>
                        </TabsList>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleStart()}>
                                <RefreshCw className="size-3 mr-2" />
                                Reset Demo
                            </Button>
                            <Button size="sm">Save Theme</Button>
                        </div>
                    </div>

                    <div className="flex-1 rounded-xl border bg-muted/30 p-8 flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-grid-slate-200/50 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25 pointer-events-none" />

                        <TabsContent value="desktop" className="m-0 w-full max-w-[420px] shadow-2xl rounded-2xl overflow-hidden mt-0">
                            <CaptchaPreview config={config} isPlaying={isPlaying} onStart={handleStart} progress={progress} />
                        </TabsContent>

                        <TabsContent value="mobile" className="m-0 w-[320px] shadow-2xl rounded-2xl overflow-hidden mt-0">
                            <CaptchaPreview config={config} isPlaying={isPlaying} onStart={handleStart} progress={progress} />
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        </div>
    )
}

function CaptchaPreview({ config, isPlaying, onStart, progress }: { config: any, isPlaying: boolean, onStart: () => void, progress: number }) {
    // Styles derived from config
    const containerStyle = {
        '--playproof-primary': config.primaryColor,
        '--playproof-secondary': config.secondaryColor,
        '--playproof-background': config.backgroundColor,
        '--playproof-surface': config.surfaceColor,
        '--playproof-text': config.textColor,
        '--playproof-border-radius': `${config.borderRadius}px`,
    } as React.CSSProperties

    return (
        <div
            className="bg-[var(--playproof-background)] p-4 border border-border/10 text-[var(--playproof-text)] font-sans"
            style={containerStyle}
        >
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold m-0 flex items-center gap-2 text-[var(--playproof-text)]">
                    <span className="w-6 h-6 rounded bg-gradient-to-br from-[var(--playproof-primary)] to-[var(--playproof-secondary)] flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
                    </span>
                    Verify you're human
                </h2>
                {config.showTimer && (
                    <span className="text-[11px] font-medium bg-[var(--playproof-surface)] text-[var(--playproof-text)]/70 px-2 py-1 rounded">
                        {isPlaying ? "0:09" : "0:10"}
                    </span>
                )}
            </div>

            <div className="bg-[var(--playproof-surface)] rounded-lg min-h-[280px] relative overflow-hidden cursor-crosshair select-none">

                {!isPlaying ? (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center w-[85%] max-w-[300px] p-6">
                        <div className="w-14 h-14 mx-auto mb-4 bg-gradient-to-br from-[var(--playproof-primary)]/15 to-[var(--playproof-secondary)]/15 rounded-2xl flex items-center justify-center">
                            <Gamepad2 className="w-7 h-7 text-[var(--playproof-primary)]" />
                        </div>
                        <h3 className="text-lg font-bold mb-2 bg-gradient-to-br from-[var(--playproof-text)] to-[var(--playproof-primary)] bg-clip-text text-transparent">
                            {config.type === 'bubble-pop' ? "Quick Game Challenge" : "Verification Challenge"}
                        </h3>
                        <p className="text-xs text-[var(--playproof-text)]/60 mb-5 leading-relaxed">
                            {config.type === 'bubble-pop' ? "Pop the bubbles as fast as you can to prove you're human." : "Complete the challenge to verify."}
                        </p>
                        <button
                            onClick={onStart}
                            className="w-full bg-gradient-to-br from-[var(--playproof-primary)] to-[var(--playproof-secondary)] text-white border-0 py-3 px-8 rounded-lg text-sm font-semibold cursor-pointer shadow-lg shadow-[var(--playproof-primary)]/20 hover:translate-y-[-1px] transition-all"
                        >
                            Begin Challenge
                        </button>
                    </div>
                ) : (
                    <div className="absolute inset-0 p-4">
                        {/* Simulated Gameplay Elements */}
                        {config.type === 'bubble-pop' && (
                            <>
                                <div className="absolute top-[20%] left-[30%] w-8 h-8 rounded-full bg-[var(--playproof-primary)] animate-pulse cursor-pointer shadow-[0_0_15px_var(--playproof-primary)] opacity-80"></div>
                                <div className="absolute top-[60%] left-[70%] w-10 h-10 rounded-full bg-[var(--playproof-secondary)] animate-bounce cursor-pointer shadow-[0_0_15px_var(--playproof-secondary)] opacity-80"></div>
                                <div className="absolute top-[40%] left-[15%] w-6 h-6 rounded-full bg-[var(--playproof-primary)] cursor-pointer shadow-[0_0_10px_var(--playproof-primary)] opacity-60"></div>
                            </>
                        )}
                        {config.type === 'match-card' && (
                            <div className="flex flex-wrap gap-2 justify-center content-center h-full p-8">
                                {[1, 2, 3, 4, 5, 6].map((i) => (
                                    <div key={i} className="w-12 h-16 bg-[var(--playproof-surface)] border-2 border-[var(--playproof-primary)] rounded flex items-center justify-center cursor-pointer hover:-translate-y-1 transition-transform">
                                        <span className="text-[var(--playproof-primary)] font-bold text-xl">?</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {config.type === 'slider' && (
                            <div className="flex items-center justify-center h-full">
                                <div className="grid grid-cols-3 gap-1 w-48 h-48 bg-[var(--playproof-surface)] p-1 rounded">
                                    {[...Array(8)].map((_, i) => (
                                        <div key={i} className="bg-[var(--playproof-background)] border border-[var(--playproof-primary)]/30 rounded flex items-center justify-center text-lg font-bold">
                                            {i + 1}
                                        </div>
                                    ))}
                                    <div className="bg-transparent"></div>
                                </div>
                            </div>
                        )}
                        <div className="absolute bottom-4 left-0 right-0 text-center text-xs text-[var(--playproof-text)]/40">
                            Simulation Mode
                        </div>
                    </div>
                )}

            </div>

            <div className="mt-2">
                <div className="h-[3px] bg-[var(--playproof-surface)] rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-[var(--playproof-primary)] to-[var(--playproof-secondary)] transition-all duration-300 ease-linear"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--playproof-border)]/10">
                <span className="text-[10px] text-[var(--playproof-text)]/50">
                    Protected by <span className="text-[var(--playproof-primary)] font-medium">Playproof</span>
                </span>
                <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500/50"></div>
                </div>
            </div>
        </div>
    )
}
