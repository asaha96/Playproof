#!/bin/bash
# Manual curl test for scoring endpoint

API_URL="${API_URL:-http://localhost:3000}"

echo "🧪 Testing PlayProof Scoring API"
echo "   API URL: $API_URL"
echo ""

# Test with sample human-like data
curl -X POST "$API_URL/api/v1/score" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test_manual_001",
    "gameType": "bubble-pop",
    "deviceType": "mouse",
    "durationMs": 10000,
    "movements": [
      {"x": 100, "y": 100, "timestamp": 0},
      {"x": 105, "y": 103, "timestamp": 16.67},
      {"x": 110, "y": 107, "timestamp": 33.34},
      {"x": 115, "y": 110, "timestamp": 50.01},
      {"x": 120, "y": 112, "timestamp": 66.68}
    ],
    "clicks": [
      {"x": 150, "y": 150, "timestamp": 2000, "targetHit": true},
      {"x": 200, "y": 200, "timestamp": 5000, "targetHit": true}
    ],
    "hits": 2,
    "misses": 0
  }' | jq '.'

echo ""
echo "✅ Test complete!"
