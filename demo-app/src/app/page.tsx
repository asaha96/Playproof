'use client';

import { useState } from 'react';
import PlayproofCaptcha, { PlayproofTheme, VerificationResult } from '@/components/PlayproofCaptcha';

// Preset themes for demo
const THEMES: Record<string, PlayproofTheme> = {
  default: {
    primary: '#6366f1',
    secondary: '#8b5cf6',
    background: '#1e1e2e',
    surface: '#2a2a3e',
    text: '#f5f5f5',
    textMuted: '#a1a1aa',
    accent: '#22d3ee',
    success: '#10b981',
    error: '#ef4444',
    border: '#3f3f5a'
  },
  ocean: {
    primary: '#0ea5e9',
    secondary: '#06b6d4',
    background: '#0c1929',
    surface: '#132337',
    text: '#f0f9ff',
    textMuted: '#7dd3fc',
    accent: '#2dd4bf',
    success: '#34d399',
    error: '#f87171',
    border: '#1e3a5f'
  },
  sunset: {
    primary: '#f97316',
    secondary: '#ef4444',
    background: '#1c1210',
    surface: '#2a1f1c',
    text: '#fff7ed',
    textMuted: '#fdba74',
    accent: '#fbbf24',
    success: '#84cc16',
    error: '#dc2626',
    border: '#44322b'
  },
  forest: {
    primary: '#22c55e',
    secondary: '#10b981',
    background: '#0f1a14',
    surface: '#1a2e23',
    text: '#f0fdf4',
    textMuted: '#86efac',
    accent: '#a3e635',
    success: '#4ade80',
    error: '#fb7185',
    border: '#2d4a3a'
  },
  midnight: {
    primary: '#a855f7',
    secondary: '#ec4899',
    background: '#0f0a1a',
    surface: '#1a1428',
    text: '#faf5ff',
    textMuted: '#c4b5fd',
    accent: '#f472b6',
    success: '#34d399',
    error: '#f87171',
    border: '#3b2960'
  }
};

export default function Home() {
  const [selectedTheme, setSelectedTheme] = useState<string>('default');
  const [threshold, setThreshold] = useState<number>(0.7);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);

  const handleSuccess = (res: VerificationResult) => {
    setResult(res);
    console.log('Verification Success!', res);
  };

  const handleFailure = (res: VerificationResult) => {
    setResult(res);
    console.log('Verification Failed', res);
  };

  const resetCaptcha = () => {
    setResult(null);
    setCaptchaKey(prev => prev + 1);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                Playproof
              </h1>
              <p className="text-slate-400 text-sm">Game-based human verification SDK</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Configuration Panel */}
          <div className="space-y-8">
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                  🎨
                </span>
                Theme Customization
              </h2>
              <div className="grid grid-cols-5 gap-3">
                {Object.entries(THEMES).map(([name, themeColors]) => (
                  <button
                    key={name}
                    onClick={() => { setSelectedTheme(name); resetCaptcha(); }}
                    className={`p-4 rounded-xl border-2 transition-all ${selectedTheme === name
                        ? 'border-indigo-500 scale-105'
                        : 'border-slate-700 hover:border-slate-600'
                      }`}
                    style={{ background: themeColors.background }}
                  >
                    <div className="flex gap-1 mb-2 justify-center">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ background: themeColors.primary }}
                      />
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ background: themeColors.secondary }}
                      />
                    </div>
                    <span className="text-xs font-medium capitalize" style={{ color: themeColors.text }}>
                      {name}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  🎯
                </span>
                Confidence Threshold
              </h2>
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-300">Required Confidence</span>
                  <span className="text-2xl font-bold text-white">{Math.round(threshold * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={threshold * 100}
                  onChange={(e) => { setThreshold(parseInt(e.target.value) / 100); resetCaptcha(); }}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <div className="flex justify-between mt-2 text-xs text-slate-500">
                  <span>Easy (0%)</span>
                  <span>Default (70%)</span>
                  <span>Hard (100%)</span>
                </div>
                <p className="mt-4 text-sm text-slate-400">
                  {threshold < 0.5 && "⚠️ Low threshold - most users will pass easily, including some bots."}
                  {threshold >= 0.5 && threshold < 0.8 && "✅ Balanced threshold - good security while being user-friendly."}
                  {threshold >= 0.8 && "🔒 High threshold - maximum security, some legitimate users may fail."}
                </p>
              </div>
            </section>

            {/* Result Display */}
            {result && (
              <section className="animate-fadeIn">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                    📊
                  </span>
                  Verification Result
                </h2>
                <div className={`rounded-xl p-6 border ${result.passed
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-red-500/10 border-red-500/30'
                  }`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${result.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                      {result.passed ? '✓' : '✗'}
                    </div>
                    <div>
                      <h3 className={`font-semibold ${result.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                        {result.passed ? 'Verification Passed!' : 'Verification Failed'}
                      </h3>
                      <p className="text-sm text-slate-400">
                        Score: {Math.round(result.score * 100)}% (Threshold: {Math.round(result.threshold * 100)}%)
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-lg font-bold text-white">{result.details.mouseMovementCount}</div>
                      <div className="text-xs text-slate-400">Mouse Movements</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-lg font-bold text-white">{result.details.clickCount}</div>
                      <div className="text-xs text-slate-400">Clicks</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-lg font-bold text-white">{Math.round(result.details.accuracy * 100)}%</div>
                      <div className="text-xs text-slate-400">Accuracy</div>
                    </div>
                  </div>
                  <button
                    onClick={resetCaptcha}
                    className="mt-4 w-full py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition text-sm font-medium"
                  >
                    Try Again
                  </button>
                </div>
              </section>
            )}
          </div>

          {/* Captcha Preview */}
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                👁️
              </span>
              Live Preview
            </h2>
            <div className="flex justify-center">
              <PlayproofCaptcha
                key={captchaKey}
                theme={THEMES[selectedTheme]}
                confidenceThreshold={threshold}
                onSuccess={handleSuccess}
                onFailure={handleFailure}
              />
            </div>

            {/* Code Example */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-3 text-slate-300">Integration Code</h3>
              <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700 overflow-x-auto">
                <pre className="text-sm text-slate-300">
                  <code>{`<PlayproofCaptcha
  theme={{
    primary: '${THEMES[selectedTheme].primary}',
    secondary: '${THEMES[selectedTheme].secondary}',
    background: '${THEMES[selectedTheme].background}',
    // ... more colors
  }}
  confidenceThreshold={${threshold}}
  onSuccess={(result) => {
    console.log('Verified!', result);
  }}
  onFailure={(result) => {
    console.log('Failed', result);
  }}
/>`}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-800 mt-16">
        <div className="max-w-6xl mx-auto px-6 py-8 text-center text-slate-500 text-sm">
          Playproof SDK Demo • Built for better human verification
        </div>
      </div>

      <style jsx global>{`
        .animate-fadeIn {
          animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}
