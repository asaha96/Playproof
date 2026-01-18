# 📦 PlayProof SDK

The official client-side SDK for **PlayProof**—the game-based human verification system. This package allows you to easily embed high-performance 3D verification games into any web application.

## ✨ Features

- **🎮 3D Mini-Games**: Built with Three.js (Snake, OSU, Archery, Bubble Pop).
- **🛰️ Behavioral Telemetry**: Captures high-fidelity movement data for bot detection.
- **⚛️ React Support**: Includes first-class React components and hooks.
- **🎨 Skinnable UI**: Fully customizable via the PlayProof Dashboard.
- **🔒 Secure**: Uses token-based verification and encrypted telemetry channels.

## 🚀 Installation

```bash
npm install playproof
```

## 🏁 Usage

### Vanilla JavaScript

```javascript
import { Playproof } from 'playproof';

const pp = new Playproof({
  containerId: 'captcha-container',
  apiKey: 'pp_xxx',
  deploymentId: 'dep_xxx',
  onSuccess: (res) => console.log('Passed!', res)
});

pp.verify();
```

### React

```tsx
import { Playproof } from 'playproof/react';

function MyForm() {
  return (
    <Playproof
      apiKey="pp_xxx"
      deploymentId="dep_xxx"
      onSuccess={(token) => submitForm(token)}
    />
  );
}
```

## 🛠️ Configuration

| Option | Type | Description |
|---|---|---|
| `apiKey` | `string` | Your PlayProof API key. |
| `deploymentId`| `string` | The ID of the specific deployment skin/game. |
| `containerId` | `string` | (Vanilla only) The DOM element ID to mount into. |
| `onSuccess` | `function` | Callback when verification succeeds. |
| `onFailure` | `function` | Callback when verification fails or errors. |

## 🏗️ Architecture

The SDK handles:
1. **Asset Loading**: Efficiently loads game assets and Three.js dependencies.
2. **Game Loop**: High-performance 60FPS game loop for smooth interaction.
3. **Telemetry Capture**: Buffering and streaming pointer/touch events.
4. **Transport**: Pluggable transport layers (Hook, LiveKit) for data delivery.

---
<p align="center">PlayProof • Verification through Movement</p>
