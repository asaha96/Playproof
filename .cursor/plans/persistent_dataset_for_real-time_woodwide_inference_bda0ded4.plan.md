---
name: Persistent Dataset for Real-time Woodwide Inference
overview: Implement a persistent "live_inference" dataset that we append sessions to and reuse for Woodwide inference, ensuring the model works for real-time game scoring instead of falling back to heuristics.
todos: []
---

# Persistent Dataset for Real-time Woodwide Inference

## Problem

Currently, the system falls back to heuristics because Woodwide inference fails for newly uploaded datasets. The `scoreSession` method creates a new dataset each time, which returns empty responses from Woodwide.

## Solution

Create and maintain a persistent "live_inference" dataset that we:

1. Create once (or check if it exists)
2. Append each new session to it
3. Run inference on the whole dataset
4. Extract the result for the new session
5. Optionally clean up old sessions periodically

## Implementation Plan

### 1. Add Persistent Dataset Management to WoodwideClient

**File**: `apps/api/src/services/woodwide.ts`

- Add method `ensurePersistentDataset(datasetName: string, initialCsv?: string): Promise<{datasetId: string, datasetName: string}>`
  - Checks if dataset exists (by name)
  - Creates it if it doesn't exist (with initial data from training dataset if available)
  - Returns dataset info

- Add method `appendToDataset(datasetName: string, csvRow: string): Promise<void>`
  - Downloads current dataset
  - Appends new row
  - Uploads with overwrite=true
  - Note: Woodwide may not have direct append API, so we download + append + re-upload

- Modify `scoreSession` to use persistent dataset:
  - Call `ensurePersistentDataset("movement_live_inference")`
  - Append the new session row to it
  - Wait for processing (2-3 seconds)
  - Run inference on the persistent dataset
  - Extract result for the last row (new session)
  - Return the result

### 2. Update Scoring Service

**File**: `apps/api/src/services/scoring.ts`

- The existing `scoreSession` call to `woodwideClient.scoreSession()` should now work with the persistent dataset approach
- No changes needed here - the WoodwideClient handles the persistent dataset internally

### 3. Add Dataset Cleanup (Optional)

**File**: `apps/api/src/services/woodwide.ts`

- Add method `cleanupDataset(datasetName: string, maxRows: number): Promise<void>`
  - Keeps only the last N rows to prevent dataset from growing indefinitely
  - Can be called periodically (e.g., when dataset exceeds 1000 rows)

### 4. Configuration

**File**: `apps/api/src/config.ts`

- Add config option for persistent dataset name:
  ```typescript
  woodwide: {
    // ... existing
    persistentDatasetName: process.env.WOODWIDE_PERSISTENT_DATASET ?? "movement_live_inference",
  }
  ```


## Technical Details

### Dataset Management Strategy

Since Woodwide may not have a direct "append" API:

1. **Option A**: Download current dataset, append row, re-upload (if download API exists)
2. **Option B**: Maintain dataset in memory/cache, append locally, upload when needed
3. **Option C**: Use Woodwide's dataset append endpoint if available

We'll implement Option A first, with fallback to Option B if download isn't available.

### Inference Result Extraction

When running inference on the persistent dataset:

- The result will be an array with one entry per row
- We need to track which row index corresponds to our new session
- Extract the result for that specific index

### Error Handling

- If persistent dataset creation fails, fall back to heuristic scoring
- If append fails, try creating a new dataset for this session
- Log all failures for debugging

## Testing

1. Test with a new session - should use persistent dataset
2. Test with multiple sessions - should append and reuse dataset
3. Test dataset creation on first use
4. Verify inference results are accurate

## Files to Modify

1. `apps/api/src/services/woodwide.ts` - Add persistent dataset methods
2. `apps/api/src/config.ts` - Add persistent dataset config
3. `apps/api/src/services/scoring.ts` - May need minor updates for error handling