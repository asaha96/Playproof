"use client"

import * as React from "react"
import { Play, RefreshCw, Loader2, CheckCircle, XCircle, Clock, Cpu, Zap } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

// Tile color mapping for visualization
const TILE_COLORS: Record<string, { bg: string; label: string }> = {
    '.': { bg: 'bg-green-500/80', label: 'Grass' },
    'B': { bg: 'bg-blue-500', label: 'Ball' },
    'H': { bg: 'bg-gray-900', label: 'Hole' },
    '#': { bg: 'bg-amber-800', label: 'Wall' },
    'S': { bg: 'bg-yellow-600', label: 'Sand' },
    '~': { bg: 'bg-blue-400', label: 'Water' },
    '^': { bg: 'bg-cyan-400', label: 'Current Up' },
    'v': { bg: 'bg-cyan-400', label: 'Current Down' },
    '<': { bg: 'bg-cyan-400', label: 'Current Left' },
    '>': { bg: 'bg-cyan-400', label: 'Current Right' },
    '1': { bg: 'bg-purple-500', label: 'Block 1' },
    '2': { bg: 'bg-purple-600', label: 'Block 2' },
    '3': { bg: 'bg-purple-700', label: 'Block 3' },
}

interface GridLevel {
    schema: string
    gameId: string
    version: number
    grid: {
        cols: number
        rows: number
        tiles: string[]
    }
    entities: Array<{ type: string; id: string; gridPos: { col: number; row: number } }>
    rules: { difficulty: string }
    design?: {
        intent?: string
        playerHint?: string
        solutionSketch?: string[]
        aestheticNotes?: string
    }
}

interface GenerationResult {
    gridLevel: GridLevel | null
    validationReport: { valid: boolean; errors: string[]; warnings: string[] }
    lintReport?: { strict: boolean; issues: string[] }
    simulationReport?: { passed: boolean; attempts: number }
    rulesetVersion: number
    signature: string
    latencyMs?: number
    model?: string
    error?: string
}

interface ModelInfo {
    id: string
    name: string
    provider: string
}

const API_BASE = 'http://localhost:3001'

export default function TestPCGPage() {
    const [models, setModels] = React.useState<ModelInfo[]>([])
    const [selectedModel, setSelectedModel] = React.useState<string>('gpt-5-mini')
    const [difficulty, setDifficulty] = React.useState<string>('easy')
    const [isLoading, setIsLoading] = React.useState(false)
    const [result, setResult] = React.useState<GenerationResult | null>(null)
    const [error, setError] = React.useState<string | null>(null)

    // Fetch available models on mount
    React.useEffect(() => {
        fetch(`${API_BASE}/pcg/models`)
            .then(res => res.json())
            .then(data => {
                setModels(data.models || [])
            })
            .catch(err => {
                console.error('Failed to fetch models:', err)
                // Fallback models
                setModels([
                    { id: 'gpt-5-mini', name: 'GPT-5 Mini (Azure)', provider: 'azure' },
                    { id: 'kimi-k2', name: 'Kimi K2 (Groq)', provider: 'groq' },
                    { id: 'llama-3.3-70b', name: 'Llama 3.3 70B (Groq)', provider: 'groq' },
                    { id: 'llama-4-scout', name: 'Llama 4 Scout (Groq)', provider: 'groq' },
                ])
            })
    }, [])

    const generateLevel = async () => {
        setIsLoading(true)
        setError(null)
        setResult(null)

        const startTime = Date.now()

        try {
            const response = await fetch(`${API_BASE}/pcg/level`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gameId: 'mini-golf',
                    difficulty,
                    model: selectedModel,
                    skipSimulation: true,
                    skipCache: true,
                }),
            })

            const data = await response.json()
            const latencyMs = Date.now() - startTime

            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate level')
            }

            setResult({ ...data, latencyMs })
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold tracking-tight">PCG Level Test</h1>
                    <p className="text-muted-foreground mt-1">
                        Generate and visualize procedurally generated mini-golf levels
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-6">
                    {/* Controls Panel */}
                    <div className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Cpu className="size-4" />
                                    Generation Settings
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Model</Label>
                                    <Select value={selectedModel} onValueChange={(v: string) => v && setSelectedModel(v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select model" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {models.map(model => (
                                                <SelectItem key={model.id} value={model.id}>
                                                    <span className="flex items-center gap-2">
                                                        {model.name}
                                                        <Badge variant="outline" className="text-[10px]">
                                                            {model.provider}
                                                        </Badge>
                                                    </span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Difficulty</Label>
                                    <Select value={difficulty} onValueChange={(v: string) => v && setDifficulty(v)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="easy">Easy</SelectItem>
                                            <SelectItem value="medium">Medium</SelectItem>
                                            <SelectItem value="hard">Hard</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <Button
                                    className="w-full"
                                    onClick={generateLevel}
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="size-4 mr-2 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Play className="size-4 mr-2" />
                                            Generate Level
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Results Stats */}
                        {result && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Zap className="size-4" />
                                        Generation Results
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground">Model</span>
                                        <Badge variant="secondary">{result.model || selectedModel}</Badge>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground">Latency</span>
                                        <span className="flex items-center gap-1 text-sm font-mono">
                                            <Clock className="size-3" />
                                            {result.latencyMs}ms
                                        </span>
                                    </div>

                                    <Separator />

                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground">Validation</span>
                                        {result.validationReport?.valid ? (
                                            <Badge variant="default" className="bg-green-600">
                                                <CheckCircle className="size-3 mr-1" />
                                                Valid
                                            </Badge>
                                        ) : (
                                            <Badge variant="destructive">
                                                <XCircle className="size-3 mr-1" />
                                                Invalid
                                            </Badge>
                                        )}
                                    </div>

                                    {result.simulationReport && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">Solvable</span>
                                            {result.simulationReport.passed ? (
                                                <Badge variant="default" className="bg-green-600">
                                                    <CheckCircle className="size-3 mr-1" />
                                                    Yes ({result.simulationReport.attempts} tries)
                                                </Badge>
                                            ) : (
                                                <Badge variant="destructive">
                                                    <XCircle className="size-3 mr-1" />
                                                    No
                                                </Badge>
                                            )}
                                        </div>
                                    )}

                                    {result.validationReport?.errors?.length > 0 && (
                                        <div className="mt-2">
                                            <p className="text-xs font-medium text-destructive mb-1">Errors:</p>
                                            <ul className="text-xs text-destructive/80 list-disc list-inside">
                                                {result.validationReport.errors.map((err, i) => (
                                                    <li key={i}>{err}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Design Info */}
                        {result?.gridLevel?.design && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm">Design Intent</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm">
                                    {result.gridLevel.design.intent && (
                                        <p className="text-muted-foreground">{result.gridLevel.design.intent}</p>
                                    )}
                                    {result.gridLevel.design.playerHint && (
                                        <p className="text-xs italic">&quot;{result.gridLevel.design.playerHint}&quot;</p>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Error Display */}
                        {error && (
                            <Card className="border-destructive">
                                <CardContent className="pt-4">
                                    <p className="text-destructive text-sm">{error}</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Grid Visualization */}
                    <Card className="min-h-[600px]">
                        <CardHeader>
                            <CardTitle>Level Preview</CardTitle>
                            <CardDescription>
                                20 columns x 14 rows grid visualization
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex items-center justify-center h-[500px]">
                                    <div className="text-center">
                                        <Loader2 className="size-12 animate-spin mx-auto text-muted-foreground" />
                                        <p className="mt-4 text-muted-foreground">Generating level...</p>
                                    </div>
                                </div>
                            ) : result?.gridLevel ? (
                                <div className="space-y-4">
                                    <GridRenderer tiles={result.gridLevel.grid.tiles} />
                                    <TileLegend />
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-[500px] border-2 border-dashed rounded-lg">
                                    <div className="text-center text-muted-foreground">
                                        <Play className="size-12 mx-auto mb-4 opacity-50" />
                                        <p>Click &quot;Generate Level&quot; to create a new level</p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

function GridRenderer({ tiles }: { tiles: string[] }) {
    const TILE_SIZE = 28 // pixels per tile

    return (
        <div className="overflow-auto">
            <div
                className="inline-grid gap-[1px] bg-gray-800 p-[1px] rounded-lg"
                style={{
                    gridTemplateColumns: `repeat(20, ${TILE_SIZE}px)`,
                    gridTemplateRows: `repeat(14, ${TILE_SIZE}px)`,
                }}
            >
                {tiles.map((row, rowIdx) =>
                    row.split('').map((tile, colIdx) => (
                        <Tile key={`${rowIdx}-${colIdx}`} char={tile} />
                    ))
                )}
            </div>

            {/* Row/Column labels */}
            <div className="flex justify-between mt-2 text-xs text-muted-foreground font-mono">
                <span>Cols: 0-19</span>
                <span>Rows: 0-13</span>
            </div>
        </div>
    )
}

function Tile({ char }: { char: string }) {
    const config = TILE_COLORS[char] || { bg: 'bg-gray-500', label: char }

    // Special rendering for ball and hole
    if (char === 'B') {
        return (
            <div className={`${config.bg} flex items-center justify-center rounded-sm`}>
                <div className="w-4 h-4 bg-white rounded-full shadow-inner" />
            </div>
        )
    }

    if (char === 'H') {
        return (
            <div className={`${config.bg} flex items-center justify-center rounded-sm`}>
                <div className="w-3 h-3 bg-black rounded-full border-2 border-gray-600" />
            </div>
        )
    }

    // Current arrows
    if (['^', 'v', '<', '>'].includes(char)) {
        const arrows: Record<string, string> = { '^': '↑', 'v': '↓', '<': '←', '>': '→' }
        return (
            <div className={`${config.bg} flex items-center justify-center rounded-sm text-white text-xs font-bold`}>
                {arrows[char]}
            </div>
        )
    }

    return (
        <div className={`${config.bg} rounded-sm`} title={config.label} />
    )
}

function TileLegend() {
    const legendItems = [
        { char: '.', label: 'Grass' },
        { char: 'B', label: 'Ball' },
        { char: 'H', label: 'Hole' },
        { char: '#', label: 'Wall' },
        { char: 'S', label: 'Sand' },
        { char: '~', label: 'Water' },
    ]

    return (
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t">
            {legendItems.map(({ char, label }) => (
                <div key={char} className="flex items-center gap-2 text-xs">
                    <div className={`w-4 h-4 ${TILE_COLORS[char]?.bg} rounded-sm`} />
                    <span className="text-muted-foreground">{label}</span>
                </div>
            ))}
        </div>
    )
}
