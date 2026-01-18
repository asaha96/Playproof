#!/bin/bash
# Quick training script using curl (matches Woodwide API format exactly)

BASE_URL="${WOODWIDE_BASE_URL:-https://api.woodwide.ai}"
API_KEY="${WOODWIDE_API_KEY}"

if [ -z "$API_KEY" ]; then
  echo "❌ WOODWIDE_API_KEY not set"
  exit 1
fi

DATASET_NAME="${1:-movement_human_train}"
MODEL_NAME="${2:-movement_anomaly_v1}"

echo "🚀 Training anomaly model"
echo "   Dataset: $DATASET_NAME"
echo "   Model: $MODEL_NAME"
echo ""

# Train the model
echo "📤 Starting training..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/models/anomaly/train?dataset_name=$DATASET_NAME" \
  -H "accept: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "model_name=$MODEL_NAME" \
  -d "overwrite=true")

echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

MODEL_ID=$(echo "$RESPONSE" | jq -r '.id' 2>/dev/null)

if [ -z "$MODEL_ID" ] || [ "$MODEL_ID" = "null" ]; then
  echo ""
  echo "❌ Failed to start training. Check the response above."
  exit 1
fi

echo ""
echo "✅ Training started!"
echo "   Model ID: $MODEL_ID"
echo ""
echo "⏳ Checking status (will poll every 5 seconds)..."
echo ""

# Poll for completion
while true; do
  STATUS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/models/$MODEL_ID" \
    -H "accept: application/json" \
    -H "Authorization: Bearer $API_KEY")
  
  STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.training_status' 2>/dev/null)
  PROGRESS=$(echo "$STATUS_RESPONSE" | jq -r '.progress // empty' 2>/dev/null)
  
  if [ "$STATUS" = "COMPLETE" ]; then
    echo ""
    echo "🎉 Training completed!"
    echo ""
    echo "📋 Add this to your .env.local:"
    echo "ANOMALY_MODEL_ID=$MODEL_ID"
    exit 0
  elif [ "$STATUS" = "FAILED" ]; then
    ERROR=$(echo "$STATUS_RESPONSE" | jq -r '.error // "Unknown error"' 2>/dev/null)
    echo ""
    echo "❌ Training failed: $ERROR"
    exit 1
  else
    if [ -n "$PROGRESS" ]; then
      printf "\r   Status: %s (%.1f%%)" "$STATUS" "$(echo "$PROGRESS * 100" | bc -l 2>/dev/null || echo 0)"
    else
      printf "\r   Status: %s..." "$STATUS"
    fi
  fi
  
  sleep 5
done
