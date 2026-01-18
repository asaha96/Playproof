# AGENTS.md

> This file is the single source of truth for AI agents working on this repository.
> **Update this file immediately after any meaningful change.**

## Project Intent

**PlayProof** = Deployment-based verification SDK + services

A human verification system that replaces traditional CAPTCHAs with branded deployments that measure behavioral patterns to distinguish humans from bots.

---

## Non-Negotiables / Invariants

1. **`apps/web` must exist on all branches**
   - This is the canonical web app location (merge-conflict prevention)
   - Never rename or remove this folder
   - Never duplicate web app logic elsewhere without updating this document

2. **Keep `demo-app/` intact**
   - Legacy/demo application for testing
   - Must remain functional until explicitly deprecated
   - Long-term: `apps/web` is the canonical web app; `demo-app` is for quick demos/testing

3. **SDK published name stays `playproof`**
   - Package lives at `packages/playproof/`
   - npm publish name: `playproof`

4. **Always use TypeScript, never JavaScript**
   - All new code must be written in TypeScript (`.ts`, `.tsx`)
   - Never create `.js` or `.jsx` files (except for config files like `next.config.js`)
   - Prefer strict type safety over `any` types

---

## Repository Map

```
Playproof/
├── apps/
│   ├── web/              # Canonical web app (Next.js, includes API routes)
│   │   └── woodwide/     # Woodwide data, scripts, tests, docs
│   ├── api/              # Legacy Fastify API (deprecated; not source of truth)
│   └── edge-worker/      # Cloudflare Worker (token issuance, caching, prefilter)
├── convex/               # Convex backend (schema, functions)
├── packages/
│   ├── playproof/        # SDK package (published as 'playproof')
│   │   └── src/          # SDK source code
│   └── shared/           # Shared types, contracts, utilities
├── demo-app/             # Legacy Next.js demo (kept for testing)
├── AGENTS.md             # THIS FILE - agent synchronization
├── README.md             # Project documentation
└── package.json          # Workspace root (npm workspaces)
```

### Folder Responsibilities

| Folder | Purpose | Tech Stack |
|--------|---------|------------|
| `apps/web` | Primary web application | Next.js |
| `apps/web/app/api` | API routes (scoring, training, batch, datasets) | Next.js Route Handlers |
| `apps/web/server` | API services, scoring pipeline, Woodwide client | TypeScript |
| `apps/web/woodwide` | Woodwide training data/scripts/tests/docs | TypeScript + Shell |
| `apps/api` | Legacy API orchestrator (deprecated) | Fastify + TypeScript |
| `apps/edge-worker` | Edge token issuance, caching, prefilter | Cloudflare Workers |
| `packages/playproof` | Client SDK for embedding verification deployments | TypeScript + PixiJS |
| `packages/shared` | Shared types, contracts, scoring schemas | TypeScript |
| `demo-app` | Interactive demo for testing SDK | Next.js |

### API Endpoints (`apps/web` app router)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/ready` | GET | Readiness check |
| `/metrics` | GET | Woodwide observability metrics |
| `/api/v1/score` | POST | Score a verification session (returns PASS/REVIEW/FAIL) |
| `/api/v1/training/start` | POST | Start Woodwide model training |
| `/api/v1/training/:modelId` | GET | Get training status |
| `/api/v1/datasets/upload` | POST | Upload dataset for training |
| `/api/v1/batch/stats` | GET | Batch queue + scheduler stats |
| `/api/v1/batch/process` | POST | Manually process batch inference |
| `/api/v1/batch/result/:sessionId` | GET | Get batch result for a session |
| `/api/v1/batch/scheduler/start` | POST | Start batch scheduler |
| `/api/v1/batch/scheduler/stop` | POST | Stop batch scheduler |
| `/api/v1/batch/scheduler/status` | GET | Batch scheduler status |
| `/api/v1/batch/clear` | POST | Clear batch queue |

---

## Agent Operating Rules

### When to Update AGENTS.md

Update this file **immediately** after any of these changes:

- New folder or package added
- Package renamed or moved
- Dependency structure changed (new workspace, new external dep)
- API contract changed (endpoints, SDK interface)
- New service or worker added
- Branch strategy or naming convention changed
- Build/dev commands changed

### Update Cadence

- **Before committing**: If your change is "meaningful" (see above), update this file in the same commit
- **After PR merge**: Verify AGENTS.md reflects the merged state

### What Qualifies as "Meaningful"

- Any structural change (folders, packages)
- Any interface change (API endpoints, SDK exports)
- Any new runnable service
- Any change to workspace configuration
- NOT: typo fixes, internal refactors with no API change, test additions

---

## Branch Hygiene

### Naming Conventions

- `feature/<short-description>` - New features
- `fix/<short-description>` - Bug fixes
- `refactor/<short-description>` - Code refactoring
- `docs/<short-description>` - Documentation only
- `chore/<short-description>` - Maintenance tasks

### Rules

1. **Keep PRs scoped** - One logical change per PR
2. **Avoid cross-cutting refactors on feature branches** - If you need to refactor shared code, do it in a separate PR first
3. **Parallel work pattern**:
   - Branch A works in `packages/playproof`
   - Branch B works in `apps/web/app/api` and `apps/web/server`
   - Branch C works in `packages/shared`
   - Branch D works in `apps/web/app` (UI)
   - Minimal collision because each touches different folders

---

## Commands

### Workspace Root

```bash
# Install all dependencies (all workspaces)
npm install

# Development
npm run dev              # Default dev (apps/web)
npm run dev:web          # apps/web
npm run dev:demo         # demo-app
npm run dev:api          # legacy Fastify (deprecated)
npm run dev:worker       # apps/edge-worker
npm run convex:dev       # convex dev
```

### Per-Workspace Commands

```bash
# Run specific workspace
npm run dev -w apps/web
npm run dev -w demo-app
npm run dev -w apps/api  # legacy Fastify (deprecated)
npm run dev -w apps/edge-worker

# Build specific workspace
npm run build -w apps/web
npm run build -w demo-app
```

### API Service (apps/web Next.js)

```bash
# API routes are served by the web app
npm run dev:web

# Or directly
cd apps/web
npm run dev
```

**Environment Variables** (in `.env.local`):
```
WOODWIDE_API_KEY=xxx
WOODWIDE_BASE_URL=https://api.woodwide.ai
ANOMALY_MODEL_ID=mdl_xxx
ANOMALY_THRESHOLD_PASS=1.0
ANOMALY_THRESHOLD_REVIEW=2.5
```

Legacy Fastify app (`apps/api`) remains only for reference/testing and is not the source of truth for API behavior.

---

## Merge-Conflict Guidance

### DO

- Add new services as new folders
- Keep changes scoped to one package/app per PR
- Update AGENTS.md when adding new structure

### DON'T

- Rename `apps/web` (canonical path)
- Duplicate web app logic across multiple folders without documenting canonical source
- Edit many shared files in a single feature branch
- Move `packages/playproof` without updating all imports and this file

---

## Safety Protocol (Start of Every Work Session)

```bash
# 1. Ensure clean tree
git status -sb

# 2. Fetch latest
git fetch --prune

# 3. Fast-forward pull
git pull --ff-only

# 4. If --ff-only fails: STOP and resolve via merge or rebase
#    Do not continue with a half-updated tree
```

---

## Current State

- **Workspace root**: Configured with npm workspaces
- **SDK**: `packages/playproof/` (published name: `playproof`)
- **Web app**: `apps/web/` (canonical path)
- **Dashboard**: Deployments page at `/dashboard/deployments`
- **Deployments**: Branding stored per deployment with `type` enum and `isActive` flag
- **Demo**: `demo-app/` (legacy, functional)
- **API**: `apps/web/app/api/` + `apps/web/server/` (Next.js route handlers, Woodwide integration)
  - Bot detection scoring via movement telemetry analysis
  - Feature extraction: velocity, acceleration, jerk, path efficiency, jitter, etc.
  - Woodwide ML platform integration for anomaly detection
  - Three-tier decision: PASS (≤1.0) / REVIEW (≤2.5) / FAIL (>2.5)
- **Woodwide assets**: `apps/web/woodwide/` (training data, scripts, tests, docs)
- **Legacy API**: `apps/api/` (Fastify, deprecated)
- **Worker**: `apps/edge-worker/` (Cloudflare placeholder)
- **Shared types**: `packages/shared/` includes `SessionTelemetry`, `MovementFeatures`, `ScoringResponse`
- **Convex**: `convex/` (Backend functions & schema)

---

*Last updated: Next.js API routes + Woodwide assets moved into apps/web*
