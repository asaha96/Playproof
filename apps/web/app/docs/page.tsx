import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, ChevronRight, Code, Copy, Info, Terminal } from "lucide-react";
import Link from "next/link";

export default function DocsPage() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
            {/* Header */}
            <section className="bg-slate-900 border-b border-slate-800 text-white py-16">
                <div className="container mx-auto px-4 max-w-5xl">
                    <div className="flex items-center gap-2 mb-4">
                        <Badge variant="outline" className="border-indigo-500/50 text-indigo-400 bg-indigo-500/10">v1.2.0</Badge>
                        <Badge variant="secondary" className="bg-slate-800 text-slate-400 hover:bg-slate-700">Latest</Badge>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                        Playproof SDK Documentation
                    </h1>
                    <p className="text-lg text-slate-400 max-w-2xl text-balance">
                        Complete guide to integrating Playproof's game-based CAPTCHA verification into your web application. secure, engaging, and customizable.
                    </p>
                    <div className="flex flex-wrap gap-4 mt-8">
                        <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white border-0">
                            Get Started <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                        <Button size="lg" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
                            View on GitHub
                        </Button>
                    </div>
                </div>
            </section>

            <div className="container mx-auto px-4 max-w-5xl py-12 flex flex-col items-start lg:flex-row gap-12">

                {/* Navigation Sidebar (could be sticky) */}
                <aside className="hidden lg:block w-64 shrink-0 space-y-8 sticky top-8">
                    <div className="space-y-3">
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Getting Started</h4>
                        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                            <li><Link href="#installation" className="hover:text-indigo-600 dark:hover:text-indigo-400">Installation</Link></li>
                            <li><Link href="#basic-usage" className="hover:text-indigo-600 dark:hover:text-indigo-400">Basic Usage</Link></li>
                        </ul>
                    </div>
                    <div className="space-y-3">
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Configuration</h4>
                        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                            <li><Link href="#options" className="hover:text-indigo-600 dark:hover:text-indigo-400">SDK Options</Link></li>
                            <li><Link href="#theming" className="hover:text-indigo-600 dark:hover:text-indigo-400">Theming & Styling</Link></li>
                            <li><Link href="#games" className="hover:text-indigo-600 dark:hover:text-indigo-400">Game Types</Link></li>
                        </ul>
                    </div>
                    <div className="space-y-3">
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Advanced</h4>
                        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                            <li><Link href="#callbacks" className="hover:text-indigo-600 dark:hover:text-indigo-400">Event Callbacks</Link></li>
                            <li><Link href="#security" className="hover:text-indigo-600 dark:hover:text-indigo-400">Security Best Practices</Link></li>
                        </ul>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 space-y-16">

                    {/* Installation */}
                    <section id="installation" className="scroll-mt-24 space-y-6">
                        <div>
                            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Installation</h2>
                            <p className="text-slate-600 dark:text-slate-400">Add Playproof to your project using your preferred package manager.</p>
                        </div>

                        <Card className="bg-slate-950 border-slate-800 text-slate-300 overflow-hidden">
                            <CardContent className="p-0">
                                <Tabs defaultValue="npm">
                                    <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/50 px-4">
                                        <TabsList className="bg-transparent h-12 p-0 space-x-2">
                                            <TabsTrigger value="npm" className="data-[state=active]:bg-transparent data-[state=active]:text-indigo-400 data-[state=active]:shadow-none data-[state=active]:border-b-2 border-indigo-500 rounded-none h-full px-4">npm</TabsTrigger>
                                            <TabsTrigger value="pnpm" className="data-[state=active]:bg-transparent data-[state=active]:text-indigo-400 data-[state=active]:shadow-none data-[state=active]:border-b-2 border-indigo-500 rounded-none h-full px-4">pnpm</TabsTrigger>
                                            <TabsTrigger value="yarn" className="data-[state=active]:bg-transparent data-[state=active]:text-indigo-400 data-[state=active]:shadow-none data-[state=active]:border-b-2 border-indigo-500 rounded-none h-full px-4">yarn</TabsTrigger>
                                        </TabsList>
                                    </div>
                                    <TabsContent value="npm" className="p-6 font-mono text-sm mt-0">
                                        <div className="flex items-center justify-between">
                                            <span className="flex gap-2"><span className="text-indigo-400">$</span> npm install playproof</span>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-500 hover:text-white"><Copy className="h-4 w-4" /></Button>
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="pnpm" className="p-6 font-mono text-sm mt-0">
                                        <div className="flex items-center justify-between">
                                            <span className="flex gap-2"><span className="text-indigo-400">$</span> pnpm add playproof</span>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-500 hover:text-white"><Copy className="h-4 w-4" /></Button>
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="yarn" className="p-6 font-mono text-sm mt-0">
                                        <div className="flex items-center justify-between">
                                            <span className="flex gap-2"><span className="text-indigo-400">$</span> yarn add playproof</span>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-500 hover:text-white"><Copy className="h-4 w-4" /></Button>
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
                            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Basic Usage</h2>
                            <p className="text-slate-600 dark:text-slate-400">Initialize the SDK with a container element and basic configuration.</p>
                        </div>

                        <div className="grid gap-6">
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-md bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">1</div>
                                    Add a Container
                                </h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400 pl-8">Create an empty `div` (or any block element) with a unique ID where the CAPTCHA will be rendered.</p>
                                <div className="pl-8">
                                    <Card className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                        <CardContent className="p-4 font-mono text-xs md:text-sm overflow-x-auto">
                                            <span className="text-blue-600">&lt;div</span> <span className="text-purple-600">id</span>=<span className="text-green-600">"playproof-captcha"</span><span className="text-blue-600">&gt;&lt;/div&gt;</span>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-md bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">2</div>
                                    Initialize the SDK
                                </h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400 pl-8">Import `Playproof` and initialize it, passing the `containerId`. Call `verify()` to start the process.</p>
                                <div className="pl-8">
                                    <Card className="bg-slate-950 border-slate-800 overflow-hidden">
                                        <CardHeader className="bg-slate-900/50 py-2 px-4 border-b border-slate-800">
                                            <div className="flex items-center gap-2">
                                                <Code className="h-4 w-4 text-indigo-400" />
                                                <span className="text-xs text-slate-400 font-mono">MyComponent.tsx</span>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-6 font-mono text-xs md:text-sm text-slate-300 overflow-x-auto">
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
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Configuration Options</h2>
                            <p className="text-slate-600 dark:text-slate-400 mb-6">The `PlayproofConfig` object allows you to customize behavior, games, and difficulty.</p>
                        </div>

                        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold border-b border-slate-200 dark:border-slate-800">
                                    <tr>
                                        <th className="px-6 py-4">Property</th>
                                        <th className="px-6 py-4">Type</th>
                                        <th className="px-6 py-4">Description</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-950">
                                    <tr>
                                        <td className="px-6 py-4 font-mono text-indigo-600 dark:text-indigo-400">containerId</td>
                                        <td className="px-6 py-4 font-mono text-slate-500">string</td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">The DOM ID of the element where the widget will mount. <span className="text-xs ml-1 inline-flex items-center px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">Required</span></td>
                                    </tr>
                                    <tr>
                                        <td className="px-6 py-4 font-mono text-indigo-600 dark:text-indigo-400">gameId</td>
                                        <td className="px-6 py-4 font-mono text-slate-500">'bubble-pop' | 'archery'</td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">The specific microgame to load. Defaults to `bubble-pop`.</td>
                                    </tr>
                                    <tr>
                                        <td className="px-6 py-4 font-mono text-indigo-600 dark:text-indigo-400">confidenceThreshold</td>
                                        <td className="px-6 py-4 font-mono text-slate-500">number (0.0 - 1.0)</td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">Minimum score required to pass verification. Default `0.7`.</td>
                                    </tr>
                                    <tr>
                                        <td className="px-6 py-4 font-mono text-indigo-600 dark:text-indigo-400">theme</td>
                                        <td className="px-6 py-4 font-mono text-slate-500">PlayproofTheme</td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">Object to override default colors. See Styling section.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <Separator />

                    {/* Styling */}
                    <section id="theming" className="scroll-mt-24 space-y-6">
                        <div>
                            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Theming & Styling</h2>
                            <p className="text-slate-600 dark:text-slate-400">Match the widget to your brand using the `theme` configuration object or CSS variables.</p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h3 className="font-semibold text-slate-900 dark:text-white">Theme Object</h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Pass these values directly into the constructor for immediate customization.</p>
                                <Card className="bg-slate-950 border-slate-800">
                                    <CardContent className="p-4 font-mono text-xs text-slate-300">
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
                                <h3 className="font-semibold text-slate-900 dark:text-white">Color Tokens</h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400">The SDK uses a semantic color system. Here are the key tokens:</p>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-3 text-sm p-2 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                        <div className="w-8 h-8 rounded bg-indigo-600 shrink-0"></div>
                                        <div>
                                            <div className="font-mono font-bold text-slate-900 dark:text-white">primary</div>
                                            <div className="text-xs text-slate-500">Main brand color, used for buttons</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm p-2 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                        <div className="w-8 h-8 rounded bg-slate-900 shrink-0 border border-slate-700"></div>
                                        <div>
                                            <div className="font-mono font-bold text-slate-900 dark:text-white">background</div>
                                            <div className="text-xs text-slate-500">Widget background color</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm p-2 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                        <div className="w-8 h-8 rounded bg-cyan-400 shrink-0"></div>
                                        <div>
                                            <div className="font-mono font-bold text-slate-900 dark:text-white">accent</div>
                                            <div className="text-xs text-slate-500">Highlights and interactive elements</div>
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
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Event Callbacks</h2>
                            <p className="text-slate-600 dark:text-slate-400">Listen for success, failure, or progress events to trigger app logic.</p>
                        </div>

                        <div className="space-y-4">
                            <Card className="p-6 bg-slate-50 dark:bg-slate-900 border-none shadow-sm">
                                <div className="grid gap-4">
                                    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-2">
                                        <div className="font-mono text-sm text-indigo-600 dark:text-indigo-400">onSuccess(result)</div>
                                        <div className="text-sm text-slate-600 dark:text-slate-400">Called when the user passes the verification. The `result` object contains the score and behavior data. <br /> <strong className="text-slate-900 dark:text-white">Use this to enable your submit button.</strong></div>
                                    </div>
                                    <Separator className="bg-slate-200 dark:bg-slate-800" />
                                    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-2">
                                        <div className="font-mono text-sm text-indigo-600 dark:text-indigo-400">onFailure(result)</div>
                                        <div className="text-sm text-slate-600 dark:text-slate-400">Called when verification fails. You might want to log this or offer a retry (which happens automatically in the UI usually).</div>
                                    </div>
                                    <Separator className="bg-slate-200 dark:bg-slate-800" />
                                    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-2">
                                        <div className="font-mono text-sm text-indigo-600 dark:text-indigo-400">onProgress(pct)</div>
                                        <div className="text-sm text-slate-600 dark:text-slate-400">Updates during game play with a float 0-1 representing completion.</div>
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
