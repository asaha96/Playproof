# Batch Inference System

## Overview

The batch inference system allows PlayProof to process multiple verification sessions together using Woodwide's anomaly detection model. This addresses the limitation where single-session inference returns empty responses.

## Architecture

### Components

1. **Session Queue** (`src/services/batch/queue.ts`)
   - In-memory queue for sessions awaiting batch processing
   - Tracks processed/unprocessed sessions
   - Stores results for retrieval

2. **Batch Inference Service** (`src/services/batch/inference.ts`)
   - Collects queued sessions
   - Builds CSV dataset with multiple sessions
   - Uploads to Woodwide
   - Runs batch inference
   - Maps results back to session IDs

3. **Batch Scheduler** (`src/services/batch/scheduler.ts`)
   - Background job that periodically processes batches
   - Configurable intervals and batch sizes
   - Automatic cleanup of old processed sessions

4. **API Routes** (`src/routes/batch.ts`)
   - `/api/v1/batch/stats` - Get queue and scheduler status
   - `/api/v1/batch/process` - Manually trigger batch processing
   - `/api/v1/batch/result/:sessionId` - Get result for a session
   - `/api/v1/batch/scheduler/start` - Start scheduler
   - `/api/v1/batch/scheduler/stop` - Stop scheduler
   - `/api/v1/batch/scheduler/status` - Get scheduler status
   - `/api/v1/batch/clear` - Clear queue (admin/testing)

## Usage

### Automatic Batch Processing

The scheduler starts automatically when the API server starts. It:
- Checks every 30 seconds for queued sessions
- Processes batches when:
  - At least 10 sessions are queued, OR
  - 5 minutes have passed since last processing (even with fewer sessions)

### Manual Batch Processing

```bash
# Trigger batch processing manually
curl -X POST http://localhost:3002/api/v1/batch/process

# Check queue status
curl http://localhost:3002/api/v1/batch/stats

# Get result for a session
curl http://localhost:3002/api/v1/batch/result/test_session_123
```

### Using Batch Mode in Scoring

The scoring service supports batch mode:

```typescript
import { scoreSession } from "./services/scoring.js";

// Queue for batch processing (returns heuristic result immediately)
const result = await scoreSession(telemetry, { useBatch: true });

// Later, check for Woodwide result
const batchResult = getSessionResult(telemetry.sessionId);
```

## Configuration

Default settings (in `src/services/batch/scheduler.ts`):
- **Interval**: 30 seconds
- **Min Batch Size**: 10 sessions
- **Max Wait Time**: 5 minutes
- **Batch Processing Size**: 50 sessions per batch

## Current Status

✅ **Implemented:**
- Session queue with in-memory storage
- Batch dataset creation and upload
- Batch inference orchestration
- Result mapping and storage
- Background scheduler
- API endpoints for management

⚠️ **Known Limitation:**
- Woodwide's inference endpoint currently returns empty responses for newly uploaded datasets
- This may require:
  - Longer processing time after upload
  - Minimum dataset size requirements
  - Pre-processing or dataset establishment period

**Workaround:**
- System gracefully falls back to heuristic scoring
- Batch results are stored when available
- Scheduler continues to retry periodically

## Testing

```bash
# Run batch inference test
cd apps/api
npx tsx test-batch.ts
```

## Future Improvements

1. **Persistent Queue**: Use Redis or database for queue persistence
2. **Result Storage**: Store results in database for long-term retrieval
3. **Retry Logic**: Implement exponential backoff for failed batches
4. **Metrics**: Add Prometheus metrics for batch processing stats
5. **Dataset Reuse**: Maintain a persistent dataset that gets appended to instead of creating new ones
