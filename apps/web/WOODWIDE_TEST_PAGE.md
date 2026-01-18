# Woodwide Test Page

## Overview

The Woodwide Test Page (`/dashboard/woodwide-test`) provides a comprehensive testing interface for the full Woodwide bot detection system integration.

## Features

### 1. Real-time Scoring Tests
- **Test Human-like Movement**: Simulates natural human movement patterns with variation, curves, and pauses
- **Test Bot-like Movement**: Simulates bot behavior with perfect straight lines and consistent timing
- **Test Short Session**: Tests edge case with minimal movement data

Each test:
- Sends telemetry to the scoring API
- Displays full scoring results including:
  - Decision (PASS/REVIEW/FAIL)
  - Confidence score
  - Anomaly score from Woodwide or heuristic fallback
  - Model used (Woodwide model ID or heuristic_fallback)
  - Key feature metrics
  - Latency

### 2. Batch Inference Management
- View queue status (total, unprocessed, processed sessions)
- Monitor scheduler status (running, processing, last processed time)
- Manually trigger batch processing
- Auto-refresh every 5 seconds

### 3. System Stats
- API health status
- Woodwide configuration status
- Integration metrics

## API Configuration

The page connects to the API at:
- Default: `http://localhost:3002`
- Configurable via `NEXT_PUBLIC_API_URL` environment variable

To configure:
```bash
# In apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3002
```

## Usage

1. Navigate to `/dashboard/woodwide-test` in the web app
2. Use the **Real-time Scoring** tab to test individual sessions
3. Use the **Batch Inference** tab to manage batch processing
4. Use the **System Stats** tab to monitor system health

## Testing Scenarios

### Human-like Test
- Expected: PASS or REVIEW
- Anomaly Score: 0.5 - 1.5
- Model: May use heuristic_fallback if Woodwide inference unavailable

### Bot-like Test
- Expected: FAIL or REVIEW
- Anomaly Score: 2.0 - 3.5
- Model: May use heuristic_fallback if Woodwide inference unavailable

### Short Session Test
- Expected: PASS (insufficient data for detailed analysis)
- Anomaly Score: 0.3 - 0.8
- Model: heuristic_fallback (short sessions typically use heuristics)

## Notes

- The system gracefully falls back to heuristic scoring if Woodwide inference is unavailable
- Batch inference may show empty responses for newly uploaded datasets (known Woodwide limitation)
- Results are displayed in real-time with full feature breakdown
- All API calls include error handling and user feedback
