import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, ChevronRight, Code, Copy, Info, Terminal } from "lucide-react";
import Link from "next/link";

export default function DocsPage() {
    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <section className="bg-muted border-b border-border py-16">
                <div className="container mx-auto px-4 max-w-5xl">
                    <div className="flex items-center gap-2 mb-4">
                        <Badge variant="outline" className="border-primary/50 text-primary bg-primary/10">v1.2.0</Badge>
                        <Badge variant="secondary" className="bg-secondary text-muted-foreground hover:bg-secondary/80">Latest</Badge>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
                        Playproof SDK Documentation
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-2xl text-balance">
                        Complete guide to integrating Playproof's game-based CAPTCHA verification into your web application. secure, engaging, and customizable.
                    </p>
                    <div className="flex flex-wrap gap-4 mt-8">
                        <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground border-0">
                            Get Started <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                        <Button size="lg" variant="outline" className="border-border text-muted-foreground hover:bg-muted hover:text-foreground">
                            View on GitHub
                        </Button>
                    </div>
                </div>
            </section>

            <div className="container mx-auto px-4 max-w-5xl py-12 flex flex-col items-start lg:flex-row gap-12">

                {/* Navigation Sidebar (could be sticky) */}
                <aside className="hidden lg:block w-64 shrink-0 space-y-8 sticky top-8">
                    <div className="space-y-3">
                        <h4 className="font-semibold text-foreground mb-4">Getting Started</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="#installation" className="hover:text-primary">Installation</Link></li>
                            <li><Link href="#basic-usage" className="hover:text-primary">Basic Usage</Link></li>
                        </ul>
                    </div>
                    <div className="space-y-3">
                        <h4 className="font-semibold text-foreground mb-4">Configuration</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="#options" className="hover:text-primary">SDK Options</Link></li>
                            <li><Link href="#theming" className="hover:text-primary">Theming & Styling</Link></li>
                            <li><Link href="#games" className="hover:text-primary">Game Types</Link></li>
                        </ul>
                    </div>
                    <div className="space-y-3">
                        <h4 className="font-semibold text-foreground mb-4">Advanced</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="#callbacks" className="hover:text-primary">Event Callbacks</Link></li>
                            <li><Link href="#security" className="hover:text-primary">Security Best Practices</Link></li>
                        </ul>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 space-y-16">

                    {/* Installation */}
                    <section id="installation" className="scroll-mt-24 space-y-6">
                        <div>
                            <h2 className="text-3xl font-bold text-foreground mb-2">Installation</h2>
                            <p className="text-muted-foreground">Add Playproof to your project using your preferred package manager.</p>
                        </div>

                        <Card className="bg-muted border-border text-foreground overflow-hidden">
                            <CardContent className="p-0">
                                <Tabs defaultValue="npm">
                                    <div className="flex items-center justify-between border-b border-border bg-background/50 px-4">
                                        <TabsList className="bg-transparent h-12 p-0 space-x-2">
                                            <TabsTrigger value="npm" className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:border-b-2 border-primary rounded-none h-full px-4">npm</TabsTrigger>
                                            <TabsTrigger value="pnpm" className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:border-b-2 border-primary rounded-none h-full px-4">pnpm</TabsTrigger>
                                            <TabsTrigger value="yarn" className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:border-b-2 border-primary rounded-none h-full px-4">yarn</TabsTrigger>
                                        </TabsList>
                                    </div>
                                    <TabsContent value="npm" className="p-6 font-mono text-sm mt-0">
                                        <div className="flex items-center justify-between">
                                            <span className="flex gap-2"><span className="text-primary">$</span> npm install playproof</span>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground"><Copy className="h-4 w-4" /></Button>
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="pnpm" className="p-6 font-mono text-sm mt-0">
                                        <div className="flex items-center justify-between">
                                            <span className="flex gap-2"><span className="text-primary">$</span> pnpm add playproof</span>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground"><Copy className="h-4 w-4" /></Button>
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="yarn" className="p-6 font-mono text-sm mt-0">
                                        <div className="flex items-center justify-between">
                                            <span className="flex gap-2"><span className="text-primary">$</span> yarn add playproof</span>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground"><Copy className="h-4 w-4" /></Button>
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </section>

                    <Separator />

                    {/* Basic Usage */}
                    <section id="basic-usage" className="scroll-mt-24 space-y-6">
                        <div>
                            <h2 className="text-3xl font-bold text-foreground mb-2">Basic Usage</h2>
                            <p className="text-muted-foreground">Initialize the SDK with a container element and basic configuration.</p>
                        </div>

                        <div className="grid gap-6">
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-md bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">1</div>
                                    Add a Container
                                </h3>
                                <p className="text-sm text-muted-foreground pl-8">Create an empty `div` (or any block element) with a unique ID where the CAPTCHA will be rendered.</p>
                                <div className="pl-8">
                                    <Card className="bg-muted border border-border">
                                        <CardContent className="p-4 font-mono text-xs md:text-sm overflow-x-auto">
                                            <span className="text-blue-600">&lt;div</span> <span className="text-purple-600">id</span>=<span className="text-green-600">"playproof-captcha"</span><span className="text-blue-600">&gt;&lt;/div&gt;</span>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-md bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">2</div>
                                    Initialize the SDK
                                </h3>
                                <p className="text-sm text-muted-foreground pl-8">Import `Playproof` and initialize it, passing the `containerId`. Call `verify()` to start the process.</p>
                                <div className="pl-8">
                                    <Card className="bg-muted border-border overflow-hidden">
                                        <CardHeader className="bg-background/50 py-2 px-4 border-b border-border">
                                            <div className="flex items-center gap-2">
                                                <Code className="h-4 w-4 text-primary" />
                                                <span className="text-xs text-muted-foreground font-mono">MyComponent.tsx</span>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-6 font-mono text-xs md:text-sm text-foreground overflow-x-auto">
                                            <pre>{`import { Playproof } from 'playproof';
import { useEffect } from 'react';

const MyComponent = () => {
  useEffect(() => {
    const playproof = new Playproof({
      containerId: 'playproof-captcha',
      onSuccess: (result) => {
        console.log('Verified!', result);
      }
    });

    playproof.verify();

    return () => playproof.destroy();
  }, []);

  return <div id="playproof-captcha"></div>;
};`}</pre>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </div>
                    </section>

                    <Separator />

                    {/* Configuration */}
                    <section id="options" className="scroll-mt-24 space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold text-foreground mb-4">Configuration Options</h2>
                            <p className="text-muted-foreground mb-6">The `PlayproofConfig` object allows you to customize behavior, games, and difficulty.</p>
                        </div>

                        <div className="overflow-hidden rounded-lg border border-border">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted text-foreground font-semibold border-b border-border">
                                    <tr>
                                        <th className="px-6 py-4">Property</th>
                                        <th className="px-6 py-4">Type</th>
                                        <th className="px-6 py-4">Description</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border bg-background">
                                    <tr>
                                        <td className="px-6 py-4 font-mono text-primary">containerId</td>
                                        <td className="px-6 py-4 font-mono text-muted-foreground">string</td>
                                        <td className="px-6 py-4 text-muted-foreground">The DOM ID of the element where the widget will mount. <span className="text-xs ml-1 inline-flex items-center px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">Required</span></td>
                                    </tr>
                                    <tr>
                                        <td className="px-6 py-4 font-mono text-primary">gameId</td>
                                        <td className="px-6 py-4 font-mono text-muted-foreground">'bubble-pop' | 'archery'</td>
                                        <td className="px-6 py-4 text-muted-foreground">The specific microgame to load. Defaults to `bubble-pop`.</td>
                                    </tr>
                                    <tr>
                                        <td className="px-6 py-4 font-mono text-primary">confidenceThreshold</td>
                                        <td className="px-6 py-4 font-mono text-muted-foreground">number (0.0 - 1.0)</td>
                                        <td className="px-6 py-4 text-muted-foreground">Minimum score required to pass verification. Default `0.7`.</td>
                                    </tr>
                                    <tr>
                                        <td className="px-6 py-4 font-mono text-primary">theme</td>
                                        <td className="px-6 py-4 font-mono text-muted-foreground">PlayproofTheme</td>
                                        <td className="px-6 py-4 text-muted-foreground">Object to override default colors. See Styling section.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <Separator />

                    {/* Styling */}
                    <section id="theming" className="scroll-mt-24 space-y-6">
                        <div>
                            <h2 className="text-3xl font-bold text-foreground mb-2">Theming & Styling</h2>
                            <p className="text-muted-foreground">Match the widget to your brand using the `theme` configuration object or CSS variables.</p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h3 className="font-semibold text-foreground">Theme Object</h3>
                                <p className="text-sm text-muted-foreground">Pass these values directly into the constructor for immediate customization.</p>
                                <Card className="bg-muted border-border">
                                    <CardContent className="p-4 font-mono text-xs text-foreground">
                                        <pre>{`const config = {
  theme: {
    primary: '#4f46e5',
    secondary: '#818cf8',
    background: '#1e293b',
    surface: '#334155',
    text: '#f8fafc',
    accent: '#22d3ee'
  }
}`}</pre>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-semibold text-foreground">Color Tokens</h3>
                                <p className="text-sm text-muted-foreground">The SDK uses a semantic color system. Here are the key tokens:</p>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-3 text-sm p-2 rounded-md bg-background border border-border">
                                        <div className="w-8 h-8 rounded bg-primary shrink-0"></div>
                                        <div>
                                            <div className="font-mono font-bold text-foreground">primary</div>
                                            <div className="text-xs text-muted-foreground">Main brand color, used for buttons</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm p-2 rounded-md bg-background border border-border">
                                        <div className="w-8 h-8 rounded bg-background shrink-0 border border-border"></div>
                                        <div>
                                            <div className="font-mono font-bold text-foreground">background</div>
                                            <div className="text-xs text-muted-foreground">Widget background color</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm p-2 rounded-md bg-background border border-border">
                                        <div className="w-8 h-8 rounded bg-cyan-500 shrink-0"></div>
                                        <div>
                                            <div className="font-mono font-bold text-foreground">accent</div>
                                            <div className="text-xs text-muted-foreground">Highlights and interactive elements</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <Separator />

                    {/* Callbacks */}
                    <section id="callbacks" className="scroll-mt-24 space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold text-foreground mb-2">Event Callbacks</h2>
                            <p className="text-muted-foreground">Listen for success, failure, or progress events to trigger app logic.</p>
                        </div>

                        <div className="space-y-4">
                            <Card className="p-6 bg-muted border-none shadow-sm">
                                <div className="grid gap-4">
                                    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-2">
                                        <div className="font-mono text-sm text-primary">onSuccess(result)</div>
                                        <div className="text-sm text-muted-foreground">Called when the user passes the verification. The `result` object contains the score and behavior data. <br /> <strong className="text-foreground">Use this to enable your submit button.</strong></div>
                                    </div>
                                    <Separator className="bg-border" />
                                    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-2">
                                        <div className="font-mono text-sm text-primary">onFailure(result)</div>
                                        <div className="text-sm text-muted-foreground">Called when verification fails. You might want to log this or offer a retry (which happens automatically in the UI usually).</div>
                                    </div>
                                    <Separator className="bg-border" />
                                    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-2">
                                        <div className="font-mono text-sm text-primary">onProgress(pct)</div>
                                        <div className="text-sm text-muted-foreground">Updates during game play with a float 0-1 representing completion.</div>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </section>

                </main>
            </div>
        </div>
    );
}
