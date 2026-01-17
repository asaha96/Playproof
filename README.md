# Playproof 🎮

A game-based captcha SDK for better human/bot segmentation. Replace traditional CAPTCHAs with engaging mini-games that measure human behavior patterns.

## Features

- **🎨 Theme Customization** - Developers can fully customize colors to match their site design
- **🎯 Configurable Confidence Threshold** - Set how strict verification should be (0-100%)
- **🕹️ Game-based Verification** - Fun mini-games instead of frustrating image puzzles
- **📊 Behavior Analysis** - Analyzes mouse movements, timing patterns, and click accuracy

## Installation

```bash
npm install playproof
```

## Quick Start

### Vanilla JavaScript

```html
<div id="playproof-container"></div>

<script type="module">
import { Playproof } from 'playproof';

const captcha = new Playproof({
  containerId: 'playproof-container',
  
  // Theme customization
  theme: {
    primary: '#6366f1',
    secondary: '#8b5cf6',
    background: '#1e1e2e',
    text: '#f5f5f5',
    accent: '#22d3ee',
    success: '#10b981',
    error: '#ef4444'
  },
  
  // Confidence threshold (0.0 - 1.0)
  confidenceThreshold: 0.7,
  
  onSuccess: (result) => {
    console.log('Human verified!', result);
    // result.score - confidence score (0-1)
    // result.passed - boolean
    // result.details - behavior metrics
  },
  
  onFailure: (result) => {
    console.log('Verification failed', result);
  }
});

captcha.verify();
</script>
```

### React / Next.js

```tsx
import PlayproofCaptcha from '@/components/PlayproofCaptcha';

function MyForm() {
  return (
    <PlayproofCaptcha
      theme={{
        primary: '#0ea5e9',
        secondary: '#06b6d4',
        background: '#0c1929',
        // ... more colors
      }}
      confidenceThreshold={0.7}
      onSuccess={(result) => {
        console.log('Verified!', result);
      }}
      onFailure={(result) => {
        console.log('Failed', result);
      }}
    />
  );
}
```

## Configuration Options

### Theme Colors

| Property | Description | Default |
|----------|-------------|---------|
| `primary` | Primary brand color | `#6366f1` |
| `secondary` | Secondary/gradient color | `#8b5cf6` |
| `background` | Container background | `#1e1e2e` |
| `surface` | Game area background | `#2a2a3e` |
| `text` | Primary text color | `#f5f5f5` |
| `textMuted` | Secondary text color | `#a1a1aa` |
| `accent` | Accent/link color | `#22d3ee` |
| `success` | Success state color | `#10b981` |
| `error` | Error state color | `#ef4444` |
| `border` | Border color | `#3f3f5a` |

### Confidence Threshold

The `confidenceThreshold` option (0.0 - 1.0) determines how confident the system must be that the user is human:

- **0.0 - 0.4** (Easy): Most users pass, lower security
- **0.5 - 0.7** (Balanced): Good security, user-friendly
- **0.8 - 1.0** (Strict): Maximum security, some legitimate users may fail

## Demo App

Run the interactive demo to test themes and thresholds:

```bash
cd demo-app
npm install
npm run dev
```

Then open http://localhost:3000

## How It Works

Playproof analyzes user behavior during a short (~10 second) mini-game:

1. **Mouse Movement Patterns** - Humans have curved, slightly jittery movements; bots move linearly
2. **Click Timing Variance** - Humans have variable reaction times; bots are too consistent
3. **Click Accuracy** - Perfect accuracy is suspicious; some misses are natural
4. **Movement Trajectories** - Humans follow bezier-like curves to targets

These metrics are combined into a confidence score that's compared against your threshold.

## License

MIT
