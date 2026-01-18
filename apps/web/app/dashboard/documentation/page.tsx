import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Check, ChevronRight, Code, Copy, Info, Terminal, Gamepad2, Palette, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";

export default function DocsPage() {
    return (
        <div className="min-h-screen bg-background pb-20">
            <div className="container mx-auto px-4 max-w-6xl py-12 flex flex-col items-start lg:flex-row gap-16">

                {/* Navigation Sidebar */}
                <aside className="hidden lg:block w-72 shrink-0 space-y-10 sticky top-24">
                    <div className="space-y-4">
                        <h4 className="font-semibold text-foreground flex items-center gap-2">
                            <Zap className="w-4 h-4 text-primary" /> Getting Started
                        </h4>
                        <ul className="space-y-2.5 text-sm text-muted-foreground border-l border-border pl-4">
                            <li><Link href="#installation" className="block hover:text-primary transition-colors hover:translate-x-1 duration-200">Installation</Link></li>
                            <li><Link href="#quick-start" className="block hover:text-primary transition-colors hover:translate-x-1 duration-200">Quick Start</Link></li>
                        </ul>
                    </div>
                    <div className="space-y-4">
                        <h4 className="font-semibold text-foreground flex items-center gap-2">
                            <Gamepad2 className="w-4 h-4 text-primary" /> Configuration
                        </h4>
                        <ul className="space-y-2.5 text-sm text-muted-foreground border-l border-border pl-4">
                            <li><Link href="#options" className="block hover:text-primary transition-colors hover:translate-x-1 duration-200">SDK Options</Link></li>
                            <li><Link href="#game-types" className="block hover:text-primary transition-colors hover:translate-x-1 duration-200">Game Types</Link></li>
                            <li><Link href="#callbacks" className="block hover:text-primary transition-colors hover:translate-x-1 duration-200">Events & Hooks</Link></li>
                        </ul>
                    </div>
                    <div className="space-y-4">
                        <h4 className="font-semibold text-foreground flex items-center gap-2">
                            <Palette className="w-4 h-4 text-primary" /> Styling
                        </h4>
                        <ul className="space-y-2.5 text-sm text-muted-foreground border-l border-border pl-4">
                            <li><Link href="#theming" className="block hover:text-primary transition-colors hover:translate-x-1 duration-200">Theme System</Link></li>
                            <li><Link href="#custom-css" className="block hover:text-primary transition-colors hover:translate-x-1 duration-200">Custom CSS</Link></li>
                        </ul>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 space-y-20 min-w-0">

                    {/* Installation */}
                    <section id="installation" className="scroll-mt-32 space-y-8">
                        <div>
                            <h2 className="text-3xl font-bold text-foreground mb-4">Installation</h2>
                            <p className="text-muted-foreground text-lg">Add the Playproof SDK to your project via your preferred package manager.</p>
                        </div>

                        <Card className="bg-muted/40 border-border text-foreground overflow-hidden shadow-sm">
                            <CardContent className="p-0">
                                <Tabs defaultValue="npm">
                                    <div className="flex items-center justify-between border-b border-border bg-muted/60 px-4">
                                        <TabsList className="bg-transparent h-12 p-0 space-x-2">
                                            <TabsTrigger value="npm" className="px-6 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm border-b-[3px] border-transparent data-[state=active]:border-primary rounded-none h-full transition-none">npm</TabsTrigger>
                                            <TabsTrigger value="pnpm" className="px-6 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm border-b-[3px] border-transparent data-[state=active]:border-primary rounded-none h-full transition-none">pnpm</TabsTrigger>
                                            <TabsTrigger value="yarn" className="px-6 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm border-b-[3px] border-transparent data-[state=active]:border-primary rounded-none h-full transition-none">yarn</TabsTrigger>
                                        </TabsList>
                                    </div>
                                    <TabsContent value="npm" className="p-8 font-mono text-sm mt-0 bg-background/50">
                                        <div className="flex items-center justify-between group">
                                            <span className="flex gap-2"><span className="text-primary select-none">$</span> npm install playproof</span>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"><Copy className="h-4 w-4" /></Button>
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="pnpm" className="p-8 font-mono text-sm mt-0 bg-background/50">
                                        <div className="flex items-center justify-between group">
                                            <span className="flex gap-2"><span className="text-primary select-none">$</span> pnpm add playproof</span>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"><Copy className="h-4 w-4" /></Button>
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="yarn" className="p-8 font-mono text-sm mt-0 bg-background/50">
                                        <div className="flex items-center justify-between group">
                                            <span className="flex gap-2"><span className="text-primary select-none">$</span> yarn add playproof</span>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"><Copy className="h-4 w-4" /></Button>
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </section>

                    <Separator className="bg-border/60" />

                    {/* Quick Start */}
                    <section id="quick-start" className="scroll-mt-32 space-y-8">
                        <div>
                            <h2 className="text-3xl font-bold text-foreground mb-4">Quick Start</h2>
                            <p className="text-muted-foreground text-lg">Initialize the SDK in your React component. It handles the entire verification lifecycle automatically.</p>
                        </div>

                        <div className="relative">
                            <div className="absolute top-4 right-4 z-10">
                                <Badge variant="outline" className="bg-background text-xs font-mono">React / Next.js</Badge>
                            </div>
                            <Card className="bg-[#0D1117] border-border overflow-hidden ring-1 ring-white/5">
                                <CardContent className="p-0">
                                    <div className="overflow-x-auto p-6 pt-10">
                                        <pre className="font-mono text-sm leading-relaxed text-slate-300">
                                            {`import { Playproof } from 'playproof';
import { useEffect, useRef } from 'react';

export default function SecurityCheck() {
  const containerRef = useRef(null);

  useEffect(() => {
    // Initialize the SDK
    const playproof = new Playproof({
      containerId: 'captcha-container',
      gameId: 'bubble-pop',
      theme: {
        primary: '#6366f1', // Indigo-600
        background: '#0f172a' // Slate-950
      },
      onSuccess: (result) => {
        console.log('User verified with score:', result.score);
        // Enable submit button or proceed
      },
      onFailure: (result) => {
        console.log('Verification failed', result);
      }
    });

    // Start only when you are ready
    playproof.verify();

    return () => playproof.destroy();
  }, []);

  return (
    <div className="p-4 border rounded-lg bg-card text-card-foreground">
      <h2 className="mb-4 font-semibold">Security Check</h2>
      {/* Container must have a fixed height */}
      <div id="captcha-container" className="h-[400px] w-full rounded-md overflow-hidden relative" />
    </div>
  );
}`}
                                        </pre>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </section>

                    <Separator className="bg-border/60" />

                    {/* Options Table */}
                    <section id="options" className="scroll-mt-32 space-y-8">
                        <div>
                            <h2 className="text-3xl font-bold text-foreground mb-4">Configuration Options</h2>
                            <p className="text-muted-foreground text-lg">Customize the SDK behavior by passing a `PlayproofConfig` object to the constructor.</p>
                        </div>

                        <div className="rounded-xl border border-border overflow-hidden bg-background">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-foreground font-semibold border-b border-border">
                                    <tr>
                                        <th className="px-6 py-4 w-1/4">Property</th>
                                        <th className="px-6 py-4 w-1/4">Type</th>
                                        <th className="px-6 py-4">Description</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    <tr className="bg-muted/5">
                                        <td className="px-6 py-5 font-mono text-primary font-medium">containerId</td>
                                        <td className="px-6 py-5 font-mono text-muted-foreground">string</td>
                                        <td className="px-6 py-5 text-muted-foreground">
                                            The ID of the DOM element where the game canvas will be mounted. <br />
                                            <span className="text-xs text-amber-500 font-medium mt-1 inline-block">Required</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="px-6 py-5 font-mono text-primary font-medium">gameId</td>
                                        <td className="px-6 py-5 font-mono text-muted-foreground">'bubble-pop' | 'archery' | 'random'</td>
                                        <td className="px-6 py-5 text-muted-foreground">
                                            The micro-game to serve to the user. 'random' will pick one based on current security policies.
                                            <div className="mt-1 text-xs text-muted-foreground/60">Default: 'bubble-pop'</div>
                                        </td>
                                    </tr>
                                    <tr className="bg-muted/5">
                                        <td className="px-6 py-5 font-mono text-primary font-medium">confidenceThreshold</td>
                                        <td className="px-6 py-5 font-mono text-muted-foreground">number (0.0 - 1.0)</td>
                                        <td className="px-6 py-5 text-muted-foreground">
                                            The minimum score required to pass verification. Higher values are stricter.
                                            <div className="mt-1 text-xs text-muted-foreground/60">Default: 0.7</div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="px-6 py-5 font-mono text-primary font-medium">gameDuration</td>
                                        <td className="px-6 py-5 font-mono text-muted-foreground">number | null</td>
                                        <td className="px-6 py-5 text-muted-foreground">
                                            Override the default duration of the game in milliseconds. If null, the game's default is used.
                                        </td>
                                    </tr>
                                    <tr className="bg-muted/5">
                                        <td className="px-6 py-5 font-mono text-primary font-medium">theme</td>
                                        <td className="px-6 py-5 font-mono text-muted-foreground">PlayproofTheme</td>
                                        <td className="px-6 py-5 text-muted-foreground">
                                            Styling overrides. See the <Link href="#theming" className="text-primary hover:underline">Theming</Link> section.
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <Separator className="bg-border/60" />

                    {/* Theming Section - THIS IS THE DEEP DIVE ON STYLING */}
                    <section id="theming" className="scroll-mt-32 space-y-10">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <h2 className="text-3xl font-bold text-foreground">Theming & Styling</h2>
                                <Badge variant="secondary" className="bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 border-purple-500/20">Deep Dive</Badge>
                            </div>
                            <p className="text-muted-foreground text-lg max-w-4xl">
                                Playproof games are rendered on an HTML5 Canvas, so standard CSS doesn't apply inside the game area.
                                Instead, we provide a robust <code>PlayproofTheme</code> object that maps your brand colors to game elements.
                            </p>
                        </div>

                        <div className="grid lg:grid-cols-2 gap-10">
                            {/* Visualizer */}
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold text-foreground">Color Token Reference</h3>
                                <div className="space-y-4">
                                    <ThemeToken
                                        name="primary"
                                        color="#6366f1"
                                        desc="Main action color. Used for the player character, primary projectiles, and 'Start' buttons."
                                    />
                                    <ThemeToken
                                        name="secondary"
                                        color="#8b5cf6"
                                        desc="Supporting elements. Used for background shapes, secondary UI highlights."
                                    />
                                    <ThemeToken
                                        name="accent"
                                        color="#22d3ee"
                                        desc="Interactive feedback. Used for hit effects, score popups, and hover states."
                                    />
                                    <ThemeToken
                                        name="background"
                                        color="#1e1e2e"
                                        desc="Canvas background color. Should contrast well with primary/secondary."
                                    />
                                    <ThemeToken
                                        name="surface"
                                        color="#2a2a3e"
                                        desc="UI panels, modals (e.g., 'Verification Complete'), and HUD backgrounds."
                                    />
                                    <ThemeToken
                                        name="text"
                                        color="#f5f5f5"
                                        desc="Primary text color for scores, instructions, and titles."
                                    />
                                    <ThemeToken
                                        name="success"
                                        color="#10b981"
                                        desc="Used for success messages and positive feedback indicators."
                                    />
                                    <ThemeToken
                                        name="error"
                                        color="#ef4444"
                                        desc="Used for failure screens and penalty indicators."
                                    />
                                </div>
                            </div>

                            {/* Code Example */}
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold text-foreground">Implementation</h3>
                                <Card className="bg-muted border-none h-fit">
                                    <CardContent className="p-6 font-mono text-sm leading-7">
                                        <span className="text-purple-400">const</span> <span className="text-blue-400">theme</span>: <span className="text-yellow-400">PlayproofTheme</span> = {'{'}
                                        <br />&nbsp;&nbsp;<span className="text-muted-foreground">// Match your brand's dark mode</span>
                                        <br />&nbsp;&nbsp;<span className="text-cyan-400">primary</span>: <span className="text-green-400">'#3b82f6'</span>,
                                        <br />&nbsp;&nbsp;<span className="text-cyan-400">background</span>: <span className="text-green-400">'#020617'</span>,
                                        <br />&nbsp;&nbsp;<span className="text-cyan-400">surface</span>: <span className="text-green-400">'#1e293b'</span>,
                                        <br />&nbsp;&nbsp;<span className="text-cyan-400">text</span>: <span className="text-green-400">'#ffffff'</span>,

                                        <br /><br />&nbsp;&nbsp;<span className="text-muted-foreground">// Feedback colors</span>
                                        <br />&nbsp;&nbsp;<span className="text-cyan-400">accent</span>: <span className="text-green-400">'#f43f5e'</span>,
                                        <br />&nbsp;&nbsp;<span className="text-cyan-400">success</span>: <span className="text-green-400">'#22c55e'</span>
                                        <br />{'}'};
                                        <br /><br />
                                        <span className="text-purple-400">const</span> <span className="text-blue-400">playproof</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">Playproof</span>({'{'}
                                        <br />&nbsp;&nbsp;<span className="text-cyan-400">theme</span>,
                                        <br />&nbsp;&nbsp;...
                                        <br />{'}'});
                                    </CardContent>
                                </Card>
                                <Alert className="bg-blue-500/10 border-blue-500/20 text-blue-500">
                                    <Info className="h-4 w-4" />
                                    <AlertTitle>Pro Tip</AlertTitle>
                                    <AlertDescription>
                                        You can pass CSS Custom Properties (Variables) like `var(--primary)`! The SDK will compute the values at runtime.
                                    </AlertDescription>
                                </Alert>
                            </div>
                        </div>
                    </section>

                    <Separator className="bg-border/60" />

                    {/* Events & Telemetry */}
                    <section id="callbacks" className="scroll-mt-32 space-y-8">
                        <div>
                            <h2 className="text-3xl font-bold text-foreground mb-4">Events & Hooks</h2>
                            <p className="text-muted-foreground text-lg"></p>
                        </div>

                        <div className="grid gap-6">
                            <EventCard
                                name="onSuccess"
                                args="(result: VerificationResult)"
                                desc="Fired when the user passes the verification challenge. This is where you should verify the token with your backend."
                            />
                            <EventCard
                                name="onFailure"
                                args="(result: VerificationResult)"
                                desc="Fired when the user fails the challenge. The SDK UI will automatically offer a retry, but you can use this to log attempts."
                            />
                            <EventCard
                                name="onProgress"
                                args="(pct: number)"
                                desc="Fires continuously during gameplay with a value between 0 and 1. Useful for custom progress bars outside the canvas."
                            />
                            <EventCard
                                name="hooks.onTelemetryBatch"
                                args="(batch: any)"
                                desc="Advanced: Receives raw mouse movement and interaction data for behavioral analysis."
                                badge="Advanced"
                            />
                        </div>
                    </section>

                </main>
            </div>
        </div>
    );
}

// Helper Components for this docs page
function ThemeToken({ name, color, desc }: { name: string, color: string, desc: string }) {
    return (
        <div className="flex items-start gap-4 p-3 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors">
            <div className="shrink-0 flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-lg shadow-sm ring-1 ring-inset ring-black/5" style={{ backgroundColor: color }}></div>
                <code className="text-[10px] text-muted-foreground uppercase tracking-wider">{color}</code>
            </div>
            <div>
                <div className="font-mono font-bold text-base text-foreground mb-1">{name}</div>
                <p className="text-sm text-muted-foreground leading-snug">{desc}</p>
            </div>
        </div>
    );
}

function EventCard({ name, args, desc, badge }: { name: string, args: string, desc: string, badge?: string }) {
    return (
        <Card className="bg-card border-border">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                    <div className="font-mono text-primary font-semibold text-lg">{name}<span className="text-muted-foreground opacity-60 text-base font-normal">{args}</span></div>
                    {badge && <Badge variant="outline" className="text-xs uppercase tracking-widest">{badge}</Badge>}
                </div>
                <p className="text-muted-foreground">{desc}</p>
            </CardContent>
        </Card>
    );
}
