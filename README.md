# 🛡️ PlayProof: The Game-Based Human Verification SDK

<div align="center">
  <p align="center">
    <img src="https://raw.githubusercontent.com/asaha96/Playproof/main/apps/web/public/next.svg" alt="PlayProof Logo" width="120" />
  </p>
  <h3><strong>The Evolution of Human Verification</strong></h3>
  <p>Replace boring CAPTCHAs with branded, interactive games that measure behavioral patterns to distinguish humans from bots.</p>

  <p align="center">
    <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white" alt="TypeScript"></a>
    <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-000000?style=flat&logo=next.js&logoColor=white" alt="Next.js"></a>
    <a href="https://threejs.org/"><img src="https://img.shields.io/badge/Three.js-000000?style=flat&logo=three.js&logoColor=white" alt="Three.js"></a>
    <a href="https://www.convex.dev/"><img src="https://img.shields.io/badge/Convex-FF4F00?style=flat&logo=convex&logoColor=white" alt="Convex"></a>
  </p>
</div>

---

## 🚀 What is PlayProof?

**PlayProof** is a next-generation human verification system designed to solve the friction caused by traditional CAPTCHAs. Instead of identifying traffic lights or clicking fire hydrants, users engage with short, satisfying 3D mini-games.

Behind the scenes, PlayProof monitors **behavioral movement telemetry**—analyzing high-frequency signals like velocity, acceleration, and jerk patterns—to verify human presence with high accuracy while maintaining a premium, non-disruptive user experience.

## ✨ Key Features

- **🎮 Satisfying Mini-Games**: High-performance 3D experiences (*Snake*, *OSU*, *Archery*, *Bubble Pop*) built with **Three.js**.
- **🧠 Behavioral Intelligence**: Advanced scoring engine powered by the Woodwide ML platform for real-time anomaly detection.
- **🛰️ Real-time Telemetry**: Low-latency data streaming via **LiveKit** for instant behavioral analysis and human-in-the-loop oversight.
- **🎨 Brand Integration**: Fully customizable themes and shapes to ensure the verification experience feels like a native part of your application.
- **📊 Insights Dashboard**: Deep observability into verification attempts, pass rates, and detailed bot detection metrics.
- **⚡ Playproof SDK**: A lightweight, Type-safe SDK compatible with React and vanilla JavaScript.

## 🏗️ Architecture

PlayProof is built as a robust monorepo designed for scale and performance:

- **`packages/playproof`**: The core SDK. Manages game state, renders 3D environments, and securely captures high-fidelity telemetry.
- **`apps/web`**: The command center. A Next.js application hosting the management dashboard, API handlers, and the scoring pipeline.
- **`convex/`**: The real-time backbone. A serverless backend managing sessions, deployments, and live attempt data with ACID compliance.
- **`packages/shared`**: Universal contracts. Shared TypeScript types and scoring schemas ensuring consistency across the entire stack.
- **`apps/edge-worker`**: Global performance. Cloudflare Worker integration for token issuance and pre-filtering at the edge.

## 🏁 Quick Start

### Installation

```bash
npm install playproof
```

### Basic Usage

```tsx
import { Playproof } from 'playproof';

const captcha = new Playproof({
  containerId: 'playproof-container',
  apiKey: 'pp_your_api_key',
  deploymentId: 'your_deployment_id',
  onSuccess: (result) => {
    console.log('✅ Human Verified!', result);
  },
  onFailure: (error) => {
    console.log('❌ Bot Detected or Error', error);
  }
});

// Initialize and start the verification
captcha.verify();
```

## 🛠️ Development Setup

### Prerequisites
- **Node.js**: 18.x or higher
- **NPM/PNPM**: Latest stable version
- **Convex**: A free [Convex](https://www.convex.dev/) account for backend functions

### Step-by-Step
1. **Clone the repository**:
   ```bash
   git clone https://github.com/asaha96/Playproof.git
   cd Playproof
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Environment Setup**:
   Create a `.env.local` file in the root based on `.env.local.example`.
4. **Run the Development Cluster**:
   ```bash
   # Start the web app and dashboard
   npm run dev
   
   # In a separate terminal, start the Convex backend
   npm run convex:dev
   ```

## 📖 In-Depth Documentation
- [**AGENTS.md**](./AGENTS.md) - Technical specifications and operating procedures for AI collaborators.
- [**METRICS_ANALYSIS.md**](./METRICS_ANALYSIS.md) - Comprehensive breakdown of behavioral signals and scoring logic.
- [**DEPLOY_CONVEX.md**](./DEPLOY_CONVEX.md) - Infrastructure guide for deploying to production.

---

<div align="center">
  <p>Built with ❤️ for a better web by the PlayProof Team</p>
  <p>
    <a href="#">Website</a> • 
    <a href="#">Documentation</a> • 
    <a href="#">Twitter</a>
  </p>
</div>
