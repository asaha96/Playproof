# Woodwide Inference Notes

## Current Status

✅ **Model Training**: Working perfectly
- Model ID: `RpzIld5nvLvgHmmbJUhI`
- Status: `COMPLETE`
- Trained on 1000 sessions

⚠️ **Single-Session Inference**: Limited
- Newly uploaded single-row datasets return empty responses
- Training dataset (1000 rows) works fine
- This suggests Woodwide may require:
  - Established/processed datasets
  - Minimum dataset size (likely 10+ rows)
  - Processing time after upload

## Working Solutions

### Option 1: Batch Inference (Recommended for Production)
Maintain a persistent "live_inference" dataset:
1. Append sessions to `movement_live_inference` dataset
2. Run inference in batches (every N sessions or time interval)
3. Map results back to session IDs

### Option 2: Use Training Dataset for Testing
For development/testing, you can use the training dataset:
```bash
curl -X POST "https://beta.woodwide.ai/api/models/anomaly/RpzIld5nvLvgHmmbJUhI/infer?dataset_name=movement_human_train&coerce_schema=true" \
  -H "Authorization: Bearer $WOODWIDE_API_KEY"
```

### Option 3: Heuristic Fallback (Current)
The system gracefully falls back to heuristic scoring when Woodwide inference isn't available. This ensures the API always works.

## Next Steps

1. **Contact Woodwide Support**: Ask about single-row inference support
2. **Implement Batching**: Create a batch inference service that:
   - Collects sessions in a buffer
   - Appends to persistent dataset every N sessions
   - Runs inference in batches
   - Updates session records with scores
3. **Hybrid Approach**: Use Woodwide for batch analysis + heuristics for real-time

## Current Implementation

The scoring service (`apps/api/src/services/scoring.ts`) automatically:
- Tries Woodwide inference first
- Falls back to heuristics if Woodwide fails
- Logs warnings (not errors) for graceful degradation

This ensures the API is always functional while we work on the batching solution.
