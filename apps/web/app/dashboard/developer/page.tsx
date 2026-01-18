"use client";

import { useState, isValidElement, ReactNode } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Copy, Eye, EyeOff, Key, RefreshCw, Zap } from "lucide-react";

export default function DeveloperPage() {
    const apiKey = useQuery(api.users.getApiKey);
    const regenerateApiKey = useMutation(api.users.regenerateApiKey);
    
    const [isKeyVisible, setIsKeyVisible] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);

    const handleCopy = async () => {
        if (apiKey) {
            await navigator.clipboard.writeText(apiKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 1000);
        }
    };

    const handleRegenerate = async () => {
        setIsRegenerating(true);
        try {
            await regenerateApiKey();
        } finally {
            setIsRegenerating(false);
        }
    };

    const maskedKey = apiKey ? `pp_${"•".repeat(32)}` : "Loading...";
    const displayKey = isKeyVisible ? apiKey : maskedKey;

    return (
        <div className="min-h-screen bg-background pb-20">
            <div className="container mx-auto px-4 max-w-4xl py-12 space-y-12">

                {/* Header */}
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold text-foreground">Developer</h1>
                    <p className="text-lg text-muted-foreground">
                        Your API key and quickstart guide to integrate PlayProof.
                    </p>
                </div>

                {/* API Key Section */}
                <Card>
                    <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                <Key className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">API Key</CardTitle>
                                <CardDescription>Use this key to authenticate your PlayProof integration</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="flex-1 rounded-lg border border-border bg-muted/50 px-4 py-3 font-mono text-sm">
                                {apiKey === undefined ? (
                                    <span className="text-muted-foreground">Loading...</span>
                                ) : apiKey === null ? (
                                    <span className="text-muted-foreground">No API key found</span>
                                ) : (
                                    <span className="select-all">{displayKey}</span>
                                )}
                            </div>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setIsKeyVisible(!isKeyVisible)}
                                disabled={!apiKey}
                                className="shrink-0"
                            >
                                {isKeyVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={handleCopy}
                                disabled={!apiKey}
                                className="shrink-0"
                            >
                                {copied ? (
                                    <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                    <Copy className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                        <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                                Keep this key secret. Do not expose it in client-side code.
                            </p>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleRegenerate}
                                disabled={isRegenerating}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <RefreshCw className={`h-3 w-3 mr-2 ${isRegenerating ? "animate-spin" : ""}`} />
                                Regenerate
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Separator />

                {/* Quickstart Section */}
                <section className="space-y-8">
                    <div className="flex items-center gap-3">
                        <Zap className="h-6 w-6 text-primary" />
                        <h2 className="text-3xl font-bold text-foreground">Quickstart</h2>
                    </div>

                    {/* Step 1: Installation */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Badge variant="outline" className="h-7 w-7 rounded-full p-0 flex items-center justify-center font-bold">1</Badge>
                            <h3 className="text-xl font-semibold text-foreground">Install the SDK</h3>
                        </div>
                        <Card className="border-border overflow-hidden">
                            <CardContent className="p-0">
                                <Tabs defaultValue="npm">
                                    <div className="flex items-center border-b border-border bg-muted/50 px-4">
                                        <TabsList className="bg-transparent h-12 p-0 space-x-2">
                                            <TabsTrigger value="npm" className="px-6 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm border-b-[3px] border-transparent data-[state=active]:border-primary rounded-none h-full transition-none">npm</TabsTrigger>
                                            <TabsTrigger value="pnpm" className="px-6 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm border-b-[3px] border-transparent data-[state=active]:border-primary rounded-none h-full transition-none">pnpm</TabsTrigger>
                                            <TabsTrigger value="yarn" className="px-6 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm border-b-[3px] border-transparent data-[state=active]:border-primary rounded-none h-full transition-none">yarn</TabsTrigger>
                                        </TabsList>
                                    </div>
                                    <TabsContent value="npm" className="p-6 font-mono text-sm mt-0 bg-muted/30">
                                        <div className="flex items-center justify-between group">
                                            <span className="flex gap-2"><span className="text-primary select-none">$</span> npm install playproof</span>
                                            <CopyButton text="npm install playproof" />
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="pnpm" className="p-6 font-mono text-sm mt-0 bg-muted/30">
                                        <div className="flex items-center justify-between group">
                                            <span className="flex gap-2"><span className="text-primary select-none">$</span> pnpm add playproof</span>
                                            <CopyButton text="pnpm add playproof" />
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="yarn" className="p-6 font-mono text-sm mt-0 bg-muted/30">
                                        <div className="flex items-center justify-between group">
                                            <span className="flex gap-2"><span className="text-primary select-none">$</span> yarn add playproof</span>
                                            <CopyButton text="yarn add playproof" />
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Step 2: Provider Setup */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Badge variant="outline" className="h-7 w-7 rounded-full p-0 flex items-center justify-center font-bold">2</Badge>
                            <h3 className="text-xl font-semibold text-foreground">Add the Provider</h3>
                        </div>
                        <p className="text-muted-foreground">
                            Wrap your app with the <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">PlayproofProvider</code> and pass your API key.
                        </p>
                        <CodeBlock filename="app/layout.tsx">
                            <SyntaxHighlightedProvider apiKey={apiKey || "pp_your_api_key"} />
                        </CodeBlock>
                    </div>

                    {/* Step 3: Component Usage */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Badge variant="outline" className="h-7 w-7 rounded-full p-0 flex items-center justify-center font-bold">3</Badge>
                            <h3 className="text-xl font-semibold text-foreground">Use the Component</h3>
                        </div>
                        <p className="text-muted-foreground">
                            Add the <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">Playproof</code> component wherever you need human verification.
                        </p>
                        <CodeBlock filename="components/verification.tsx">
                            <SyntaxHighlightedComponent />
                        </CodeBlock>
                    </div>

                    {/* That's it! */}
                    <Card className="border-green-500/30">
                        <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10 shrink-0">
                                    <Check className="h-5 w-5 text-green-500" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-foreground mb-1">That&apos;s it!</h4>
                                    <p className="text-muted-foreground text-sm">
                                        Your PlayProof integration is ready. Customize the appearance and game type from the{" "}
                                        <a href="/dashboard/deployments" className="text-primary hover:underline">Deployments</a> page.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </section>

            </div>
        </div>
    );
}

// Syntax highlighting components
function SyntaxHighlightedProvider({ apiKey }: { apiKey: string }) {
    return (
        <pre className="font-mono text-sm leading-relaxed">
            <span className="text-purple-600 dark:text-purple-400">import</span>
            <span className="text-foreground"> {"{"} </span>
            <span className="text-yellow-600 dark:text-yellow-400">PlayproofProvider</span>
            <span className="text-foreground"> {"}"} </span>
            <span className="text-purple-600 dark:text-purple-400">from</span>
            <span className="text-green-600 dark:text-green-400"> &apos;playproof&apos;</span>
            <span className="text-foreground">;</span>
            {"\n\n"}
            <span className="text-purple-600 dark:text-purple-400">export default function</span>
            <span className="text-blue-600 dark:text-blue-400"> App</span>
            <span className="text-foreground">({"{"} </span>
            <span className="text-orange-600 dark:text-orange-400">children</span>
            <span className="text-foreground"> {"}"}) {"{"}</span>
            {"\n  "}
            <span className="text-purple-600 dark:text-purple-400">return</span>
            <span className="text-foreground"> (</span>
            {"\n    "}
            <span className="text-blue-600 dark:text-blue-400">{"<"}</span>
            <span className="text-yellow-600 dark:text-yellow-400">PlayproofProvider</span>
            <span className="text-cyan-600 dark:text-cyan-400"> client_key</span>
            <span className="text-foreground">=</span>
            <span className="text-green-600 dark:text-green-400">&quot;{apiKey}&quot;</span>
            <span className="text-blue-600 dark:text-blue-400">{">"}</span>
            {"\n      "}
            <span className="text-foreground">{"{children}"}</span>
            {"\n    "}
            <span className="text-blue-600 dark:text-blue-400">{"</"}</span>
            <span className="text-yellow-600 dark:text-yellow-400">PlayproofProvider</span>
            <span className="text-blue-600 dark:text-blue-400">{">"}</span>
            {"\n  "}
            <span className="text-foreground">);</span>
            {"\n"}
            <span className="text-foreground">{"}"}</span>
        </pre>
    );
}

function SyntaxHighlightedComponent() {
    return (
        <pre className="font-mono text-sm leading-relaxed">
            <span className="text-purple-600 dark:text-purple-400">import</span>
            <span className="text-foreground"> {"{"} </span>
            <span className="text-yellow-600 dark:text-yellow-400">Playproof</span>
            <span className="text-foreground"> {"}"} </span>
            <span className="text-purple-600 dark:text-purple-400">from</span>
            <span className="text-green-600 dark:text-green-400"> &apos;playproof&apos;</span>
            <span className="text-foreground">;</span>
            {"\n\n"}
            <span className="text-purple-600 dark:text-purple-400">export default function</span>
            <span className="text-blue-600 dark:text-blue-400"> VerificationPage</span>
            <span className="text-foreground">() {"{"}</span>
            {"\n  "}
            <span className="text-purple-600 dark:text-purple-400">return</span>
            <span className="text-foreground"> (</span>
            {"\n    "}
            <span className="text-blue-600 dark:text-blue-400">{"<"}</span>
            <span className="text-yellow-600 dark:text-yellow-400">Playproof</span>
            {"\n      "}
            <span className="text-cyan-600 dark:text-cyan-400">onSuccess</span>
            <span className="text-foreground">={"{"}(</span>
            <span className="text-orange-600 dark:text-orange-400">result</span>
            <span className="text-foreground">) </span>
            <span className="text-purple-600 dark:text-purple-400">{"=>"}</span>
            <span className="text-foreground"> {"{"}</span>
            {"\n        "}
            <span className="text-foreground">console.</span>
            <span className="text-blue-600 dark:text-blue-400">log</span>
            <span className="text-foreground">(</span>
            <span className="text-green-600 dark:text-green-400">&apos;Verified!&apos;</span>
            <span className="text-foreground">, result);</span>
            {"\n        "}
            <span className="text-muted-foreground">{"// User passed verification - proceed with action"}</span>
            {"\n      "}
            <span className="text-foreground">{"}}"}</span>
            {"\n      "}
            <span className="text-cyan-600 dark:text-cyan-400">onFailure</span>
            <span className="text-foreground">={"{"}(</span>
            <span className="text-orange-600 dark:text-orange-400">result</span>
            <span className="text-foreground">) </span>
            <span className="text-purple-600 dark:text-purple-400">{"=>"}</span>
            <span className="text-foreground"> {"{"}</span>
            {"\n        "}
            <span className="text-foreground">console.</span>
            <span className="text-blue-600 dark:text-blue-400">log</span>
            <span className="text-foreground">(</span>
            <span className="text-green-600 dark:text-green-400">&apos;Failed&apos;</span>
            <span className="text-foreground">, result);</span>
            {"\n        "}
            <span className="text-muted-foreground">{"// User failed verification - show error or retry"}</span>
            {"\n      "}
            <span className="text-foreground">{"}}"}</span>
            {"\n    "}
            <span className="text-blue-600 dark:text-blue-400">{"/>"}</span>
            {"\n  "}
            <span className="text-foreground">);</span>
            {"\n"}
            <span className="text-foreground">{"}"}</span>
        </pre>
    );
}

// Helper Components
function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1000);
    };

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
        >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </Button>
    );
}

function CodeBlock({ filename, children }: { filename?: string; children: React.ReactNode }) {
    const [copied, setCopied] = useState(false);

    // Get the text content for copying
    const getTextContent = (element: ReactNode): string => {
        if (typeof element === 'string') return element;
        if (typeof element === 'number') return String(element);
        if (!element) return '';
        if (Array.isArray(element)) return element.map(getTextContent).join('');
        if (isValidElement<{ children?: ReactNode }>(element)) {
            return getTextContent(element.props.children);
        }
        return '';
    };

    const handleCopy = async () => {
        const text = getTextContent(children);
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1000);
    };

    return (
        <Card className="border-border overflow-hidden">
            <CardContent className="p-0">
                {filename && (
                    <div className="flex items-center justify-between border-b border-border px-4 py-2 bg-muted/50">
                        <span className="text-xs text-muted-foreground font-mono">{filename}</span>
                        <Badge variant="outline" className="text-xs font-mono">
                            tsx
                        </Badge>
                    </div>
                )}
                <div className="relative group">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCopy}
                        className="absolute top-3 right-3 h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <div className="overflow-x-auto p-6 bg-muted/30">
                        {children}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
