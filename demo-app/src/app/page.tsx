'use client';

import { useState } from 'react';
import PlayproofCaptcha, { PlayproofTheme, VerificationResult } from '@/components/PlayproofCaptcha';

// Clean monochrome slate theme
const SLATE_THEME: PlayproofTheme = {
  primary: '#64748b',
  secondary: '#475569',
  background: '#0f172a',
  surface: '#1e293b',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  accent: '#cbd5e1',
  success: '#22c55e',
  error: '#ef4444',
  border: '#334155'
};

export default function Home() {
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
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="border-b border-slate-800/50">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700">
                <svg className="w-5 h-5 text-slate-300" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-100 tracking-tight">
                  Playproof
                </h1>
                <p className="text-slate-500 text-xs">Human verification SDK</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Live Demo
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-2 gap-16">
          {/* Left Column - Captcha */}
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-medium text-slate-200 mb-1">Try the verification</h2>
              <p className="text-sm text-slate-500">Pop the bubbles to prove you're human</p>
            </div>
            <div className="flex justify-center lg:justify-start">
              <PlayproofCaptcha
                key={captchaKey}
                theme={SLATE_THEME}
                confidenceThreshold={threshold}
                onSuccess={handleSuccess}
                onFailure={handleFailure}
              />
            </div>
          </div>

          {/* Right Column - Controls & Results */}
          <div className="space-y-8">

            {/* Threshold Control */}
            <section>
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">Sensitivity</h3>
              <div className="bg-slate-900/50 rounded-lg p-5 border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-slate-400 text-sm">Confidence Threshold</span>
                  <span className="text-lg font-mono font-medium text-slate-200">{Math.round(threshold * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={threshold * 100}
                  onChange={(e) => { setThreshold(parseInt(e.target.value) / 100); resetCaptcha(); }}
                  className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-slate-400"
                />
                <div className="flex justify-between mt-2 text-xs text-slate-600">
                  <span>Lenient</span>
                  <span>Strict</span>
                </div>
              </div>
            </section>

            {/* Result Display */}
            {result && (
              <section className="animate-fadeIn">
                <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">Result</h3>
                <div className={`rounded-lg p-5 border ${result.passed
                  ? 'bg-emerald-950/30 border-emerald-900/50'
                  : 'bg-red-950/30 border-red-900/50'
                  }`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${result.passed ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400'
                      }`}>
                      {result.passed ? '✓' : '✗'}
                    </div>
                    <div>
                      <h4 className={`font-medium ${result.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                        {result.passed ? 'Verified' : 'Failed'}
                      </h4>
                      <p className="text-xs text-slate-500">
                        Score: {Math.round(result.score * 100)}% / {Math.round(result.threshold * 100)}% required
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-slate-900/50 rounded-md p-2.5">
                      <div className="text-sm font-mono font-medium text-slate-200">{result.details.mouseMovementCount}</div>
                      <div className="text-xs text-slate-500">Movements</div>
                    </div>
                    <div className="bg-slate-900/50 rounded-md p-2.5">
                      <div className="text-sm font-mono font-medium text-slate-200">{result.details.clickCount}</div>
                      <div className="text-xs text-slate-500">Clicks</div>
                    </div>
                    <div className="bg-slate-900/50 rounded-md p-2.5">
                      <div className="text-sm font-mono font-medium text-slate-200">{Math.round(result.details.accuracy * 100)}%</div>
                      <div className="text-xs text-slate-500">Accuracy</div>
                    </div>
                  </div>
                  <button
                    onClick={resetCaptcha}
                    className="mt-4 w-full py-2 rounded-md bg-slate-800 hover:bg-slate-700 transition text-sm text-slate-300 border border-slate-700"
                  >
                    Reset
                  </button>
                </div>
              </section>
            )}

            {/* Code Example */}
            <section>
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">Integration</h3>
              <div className="bg-slate-900/80 rounded-lg p-4 border border-slate-800 overflow-x-auto">
                <pre className="text-xs text-slate-400 font-mono">
                  <code>{`<PlayproofCaptcha
  confidenceThreshold={${threshold}}
  onSuccess={(result) => {
    // Handle verified user
  }}
  onFailure={(result) => {
    // Handle verification failure
  }}
/>`}</code>
                </pre>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-800/50 mt-16">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between text-slate-600 text-xs">
          <span>Playproof SDK Demo</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
            v1.0.0
          </span>
        </div>
      </div>

      <style jsx global>{`
        .animate-fadeIn {
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </main>
  );
}
