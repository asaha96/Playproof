# AGENTS.md

> This file is the single source of truth for AI agents working on this repository.
> **Update this file immediately after any meaningful change.**

## Project Intent

**PlayProof** = Game-based verification SDK + services

A human verification system that replaces traditional CAPTCHAs with engaging mini-games that measure behavioral patterns to distinguish humans from bots.

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
   - `packages/playproof` is TypeScript-only (no `.js` under `packages/playproof/src`)
   - `packages/playproof` is TypeScript-only (no `.js` under `packages/playproof/src`)

---

## Repository Map

```
Playproof/
├── apps/
│   ├── web/              # Canonical web app (Next.js when scaffolded)
│   ├── api/              # Fastify API orchestrator
│   └── edge-worker/      # Cloudflare Worker (token issuance, caching, prefilter)
├── packages/
│   ├── playproof/        # SDK package (published as 'playproof')
│   │   └── src/          # SDK source code
│   └── shared/           # Shared types, contracts, utilities
├── services/
│   └── scoring/          # Python FastAPI scoring service (XGBoost)
├── demo-app/             # Legacy Next.js demo (kept for testing)
├── AGENTS.md             # THIS FILE - agent synchronization
├── README.md             # Project documentation
└── package.json          # Workspace root (npm workspaces)
```

### Folder Responsibilities

| Folder | Purpose | Tech Stack |
|--------|---------|------------|
| `apps/web` | Primary web application | Next.js (placeholder for now) |
| `apps/api` | API orchestrator, endpoints: `/issue`, `/events`, `/finalize` | Fastify + TypeScript |
| `apps/edge-worker` | Edge token issuance, caching, prefilter | Cloudflare Workers |
| `packages/playproof` | Client SDK for embedding verification games | TypeScript + PixiJS |
| `packages/shared` | Shared types, contracts, utilities | TypeScript |
| `services/scoring` | ML scoring service | Python + FastAPI + XGBoost |
| `demo-app` | Interactive demo for testing SDK | Next.js |

---

## Agent Operating Rules

### When to Update AGENTS.md

Update this file **immediately** after any of these changes:

- New folder or package added
- Package renamed or moved
- Dependency structure changed (new workspace, new external dep, new root script)
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
   - Branch B works in `apps/api`
   - Branch C works in `services/scoring`
   - Branch D works in `apps/web`
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
npm run dev:demo:sdk     # packages/playproof + demo-app (concurrently)
npm run dev:api          # apps/api
npm run dev:worker       # apps/edge-worker
```

### Per-Workspace Commands

```bash
# Run specific workspace
npm run dev -w apps/web
npm run dev -w demo-app
npm run dev -w apps/api
npm run dev -w apps/edge-worker

# Build specific workspace
npm run build -w apps/web
npm run build -w demo-app
```

### Python Service (services/scoring)

```bash
cd services/scoring
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn main:app --reload
```

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
- **Web app**: `apps/web/` (placeholder, canonical path)
- **Demo**: `demo-app/` (legacy, functional)
- **API**: `apps/api/` (Fastify placeholder)
- **Worker**: `apps/edge-worker/` (Cloudflare placeholder)
- **Scoring**: `services/scoring/` (FastAPI placeholder)

---

*Last updated: Initial creation*
