# PlayProof SDK

> Game-based human verification with behavior analysis

PlayProof SDK provides an engaging alternative to traditional CAPTCHAs by using interactive mini-games that capture and analyze user behavior patterns to distinguish humans from bots.

## Features

- 🎮 **Game-based verification** - Interactive mini-games instead of annoying puzzles
- 📊 **Behavior analysis** - High-fidelity input capture with coalesced events
- 🔒 **Tamper-evident** - Hash-chain signing for data integrity
- ⚛️ **Framework agnostic** - React, Vue, Vanilla JS, and Web Components
- ♿ **Accessible** - ARIA support, keyboard navigation, screen reader friendly
- 🎨 **Customizable** - Full theme customization
- 🔧 **Developer friendly** - Debug mode, mock mode, TypeScript support

## Installation

```bash
npm install playproof-sdk
```

## Quick Start

### React

```tsx
import { usePlayproof } from 'playproof-sdk/react';

function VerificationWidget() {
  const { canvasRef, state, start, result } = usePlayproof({
    apiUrl: 'https://api.playproof.dev',
    confidenceThreshold: 0.7,
  });

  return (
    <div>
      <canvas ref={canvasRef} width={400} height={300} />
      
      {state === 'ready' && (
        <button onClick={start}>Start Verification</button>
      )}
      
      {state === 'playing' && (
        <p>Interact with the game...</p>
      )}
      
      {result && (
        <p>{result.passed ? '✓ Verified!' : '✗ Failed'}</p>
      )}
    </div>
  );
}
```

### Vue 3

```vue
<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { createUsePlayproof } from 'playproof-sdk/vue';

const usePlayproof = createUsePlayproof({ ref, computed, onMounted, onUnmounted, watch });
const { canvasRef, state, start, result } = usePlayproof({
  apiUrl: 'https://api.playproof.dev',
});
</script>

<template>
  <div>
    <canvas ref="canvasRef" width="400" height="300"></canvas>
    <button @click="start" v-if="state === 'ready'">Start</button>
    <p v-if="result">{{ result.passed ? 'Verified!' : 'Failed' }}</p>
  </div>
</template>
```

### Web Component

```html
<script src="https://unpkg.com/playproof-sdk/dist/esm/web-component.js"></script>

<play-proof-game
  api-url="https://api.playproof.dev"
  confidence-threshold="0.7"
  theme-primary="#6366f1"
></play-proof-game>

<script>
  document.querySelector('play-proof-game')
    .addEventListener('playproof:complete', (e) => {
      console.log('Verification result:', e.detail);
    });
</script>
```

### Vanilla JavaScript

```javascript
import { PlayProofClient } from 'playproof-sdk';

const canvas = document.getElementById('game-canvas');
const client = new PlayProofClient({
  apiUrl: 'https://api.playproof.dev',
  confidenceThreshold: 0.7,
});

// Subscribe to events
client.on('complete', (event) => {
  console.log('Result:', event.data);
});

// Initialize and start
await client.init(canvas);
await client.start();
```

## API Reference

### PlayProofClient

The main SDK client for programmatic usage.

```typescript
const client = new PlayProofClient({
  // Required
  apiUrl: string,
  
  // Optional
  gameDuration?: number,      // Default: 3000 (ms)
  batchInterval?: number,     // Default: 500 (ms)
  bufferDuration?: number,    // Default: 5 (seconds)
  confidenceThreshold?: number, // Default: 0.7
  theme?: PlayProofTheme,
  debug?: boolean,
  logger?: Logger,
});
```

#### Methods

- `init(canvas: HTMLCanvasElement)` - Initialize with a canvas element
- `start()` - Start the verification game
- `stop()` - Stop/cancel verification
- `reset()` - Reset to initial state
- `destroy()` - Clean up resources
- `getState()` - Get current lifecycle state
- `on(event, callback)` - Subscribe to events
- `once(event, callback)` - Subscribe once

#### Events

- `init` - SDK initialized
- `ready` - Ready to start
- `start` - Game started
- `progress` - Progress update `{ progress: number, timeRemaining: number }`
- `batch` - Batch emitted `{ batchIndex: number, eventCount: number }`
- `complete` - Verification complete `VerificationResult`
- `error` - Error occurred `Error`

### usePlayproof (React Hook)

```typescript
const {
  canvasRef,     // Ref<HTMLCanvasElement>
  state,         // LifecycleState
  progress,      // number (0-1)
  timeRemaining, // number (ms)
  result,        // VerificationResult | null
  error,         // Error | null
  start,         // () => Promise<void>
  stop,          // () => void
  reset,         // () => void
  isProcessing,  // boolean
  isPassed,      // boolean | null
} = usePlayproof(config);
```

### Theme Customization

```typescript
interface PlayProofTheme {
  primary?: string;    // Primary brand color
  secondary?: string;  // Secondary/gradient color
  background?: string; // Container background
  surface?: string;    // Game area surface
  text?: string;       // Primary text
  textMuted?: string;  // Muted text
  accent?: string;     // Accent highlights
  success?: string;    // Success state
  error?: string;      // Error state
  border?: string;     // Border color
}
```

## Developer Tools

### Debug Mode

```typescript
import { enableDebug, disableDebug } from 'playproof-sdk';

enableDebug(); // Enable verbose logging
disableDebug();
```

### Mock Mode (for testing)

```typescript
import { enableMockMode, disableMockMode } from 'playproof-sdk';

enableMockMode({
  delay: 100,           // Response delay
  forceResult: 'pass',  // Force pass/fail
  customScore: 0.85,    // Custom score
  simulateErrors: true, // Simulate network errors
  errorRate: 0.1,       // Error rate (10%)
});
```

### Performance Metrics

```typescript
import { metrics } from 'playproof-sdk';

// Get performance summary
const summary = metrics.getSummary();
console.log('Init time:', summary.init.avg, 'ms');
```

### Event Inspector

```typescript
import { eventInspector, batchInspector } from 'playproof-sdk';

// Inspect captured events
console.log(eventInspector.getStats());

// Inspect sent batches
console.log(batchInspector.getSummary());
```

## Testing

```typescript
import {
  createMockInputEvents,
  createMockVerificationResult,
  MockCanvas,
  waitFor,
  simulateClick,
} from 'playproof-sdk/testing';

// Create mock events
const events = createMockInputEvents(100);

// Simulate user interaction
const clicks = simulateClick(200, 150);

// Wait for condition
await waitFor(() => client.getState() === 'complete');
```

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 14+
- Edge 80+

### Feature Detection

```typescript
import { detectFeatures, checkRequiredFeatures } from 'playproof-sdk';

const features = detectFeatures();
console.log('Coalesced events:', features.coalescedEvents);

// Throws if required features are missing
checkRequiredFeatures();
```

## Accessibility

PlayProof SDK is designed with accessibility in mind:

- ✅ ARIA labels and roles
- ✅ Keyboard navigation
- ✅ Screen reader announcements
- ✅ Focus management
- ✅ High contrast mode support
- ✅ Reduced motion support

```typescript
import { prefersReducedMotion, isHighContrastMode } from 'playproof-sdk';

if (prefersReducedMotion()) {
  // Disable animations
}

if (isHighContrastMode()) {
  // Use high contrast colors
}
```

## Error Handling

All errors are typed and include recovery suggestions:

```typescript
import {
  PlayProofError,
  NetworkError,
  TimeoutError,
  isRecoverableError,
} from 'playproof-sdk';

try {
  await client.start();
} catch (error) {
  if (error instanceof NetworkError) {
    console.log('Network issue:', error.message);
    console.log('Suggestion:', error.suggestion);
  }
  
  if (isRecoverableError(error)) {
    // Retry
  }
}
```

## License

MIT
