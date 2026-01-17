# PlayProof

**The Next Evolution of Digital Trust**

PlayProof is a next-generation human verification SDK that replaces static puzzles with AI-generated, fast-paced games. Developed at Carnegie Mellon University, it leverages human reaction time and intuitive logic to verify authenticity.

## Quick Start

### Prerequisites

- Node.js >= 18
- Docker (for Redis)

### Setup

```bash
# Install dependencies
npm install

# Start Redis
npm run dev:infra

# Run all services in development mode
npm run dev
```

This starts:
- **SDK** (watch mode): `packages/playproof-sdk`
- **API** (port 3001): `services/api`
- **Scoring Worker**: `services/scoring-stub`
- **Demo** (port 3000): `apps/demo-web`

### Usage

#### Web Component

```html
<script type="module">
  import 'playproof-sdk/web-component';
</script>

<play-proof-game
  api-url="http://localhost:3001"
  game-duration="3000"
  theme-primary="#6366f1"
></play-proof-game>
```

#### Programmatic

```typescript
import { PlayProofClient } from 'playproof-sdk';

const client = new PlayProofClient({
  apiUrl: 'http://localhost:3001',
  gameDuration: 3000,
  onAttemptEnd: (result) => {
    if (result.result === 'pass') {
      console.log('Human verified!');
    }
  },
});

// Create challenge and mount to canvas
const challenge = await client.createChallenge();
client.mount(document.querySelector('canvas'));
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              <play-proof-game> Web Component             │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │    │
│  │  │  PixiJS     │  │   Input     │  │    Transport    │  │    │
│  │  │  Game Loop  │→ │  Collector  │→ │ (msgpack+hash)  │  │    │
│  │  └─────────────┘  └─────────────┘  └────────┬────────┘  │    │
│  └─────────────────────────────────────────────│────────────┘    │
└────────────────────────────────────────────────│─────────────────┘
                                                 │
                        POST /v1/attempts/:id/batches
                                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Fastify API (Node.js)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Challenge  │  │   Batch     │  │     Hash Chain          │  │
│  │  Issuance   │  │  Ingestion  │→ │     Validation          │  │
│  └─────────────┘  └─────────────┘  └───────────┬─────────────┘  │
└────────────────────────────────────────────────│─────────────────┘
                                                 │
                                           BullMQ Enqueue
                                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Redis                                    │
│  ┌─────────────────────────┐  ┌─────────────────────────────┐   │
│  │     Job Queue           │  │     Results Store           │   │
│  │     (attempts)          │  │     (result:{attemptId})    │   │
│  └─────────────────────────┘  └─────────────────────────────┘   │
└────────────────────────────────────────────────│─────────────────┘
                                                 │
                                           BullMQ Worker
                                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Scoring Stub (Python/Node)                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Feature Extraction → Heuristic Scoring → Result Write  │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

1. User loads page with `<play-proof-game>` element
2. SDK requests challenge from API (`POST /v1/challenge`)
3. API returns `attemptId`, `seed`, `challengeToken`, and `ttl`
4. SDK runs 3-second PixiJS game, collecting input telemetry
5. Input Collector captures pointer/wheel/keyboard events with `performance.now()` timing
6. Coalesced events are harvested for high-frequency input capture
7. Events are batched, msgpack-encoded, and hash-chain signed
8. Batches sent to API (`POST /v1/attempts/:id/batches`)
9. API validates hash-chain continuity and enqueues to BullMQ
10. Scoring worker processes batches and writes result to Redis
11. SDK polls for result (`GET /v1/attempts/:id/result`)

## Project Structure

```
playproof/
├── packages/
│   └── playproof-sdk/        # TypeScript SDK (npm: playproof-sdk)
│       ├── src/
│       │   ├── collector/    # Input collection (pointer, wheel, keyboard)
│       │   ├── transport/    # Serialization, signing, HTTP
│       │   ├── game/         # PixiJS game loop
│       │   └── web-component.ts
│       └── package.json
├── apps/
│   └── demo-web/             # Vite demo app
├── services/
│   ├── api/                  # Fastify API
│   └── scoring-stub/         # BullMQ worker
├── infra/
│   └── docker-compose.yml    # Redis
└── package.json              # Workspace root
```

## Development

```bash
# Run individual services
npm run dev:sdk      # SDK watch mode
npm run dev:api      # API server
npm run dev:worker   # Scoring worker
npm run dev:demo     # Demo app

# Build all
npm run build

# Clean
npm run clean
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/challenge` | Issue new challenge |
| `POST` | `/v1/attempts/:attemptId/batches` | Submit event batch |
| `GET` | `/v1/attempts/:attemptId/result` | Get attempt result |
| `GET` | `/health` | Health check |

## License

Proprietary - Carnegie Mellon University
