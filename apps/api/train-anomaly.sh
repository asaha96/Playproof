#!/bin/sh
# Train Anomaly Model Script
# Matches Woodwide API documentation exactly

export BASE_URL="${WOODWIDE_BASE_URL:-https://beta.woodwide.ai}"
export WOODWIDE_API_KEY="${WOODWIDE_API_KEY}"

if [ -z "$WOODWIDE_API_KEY" ]; then
  echo "❌ WOODWIDE_API_KEY not set"
  exit 1
fi

DATASET_NAME="${1:-movement_human_train}"
MODEL_NAME="${2:-movement_anomaly_v1}"
CSV_FILE="${3:-movement_human_train_1768705085769.csv}"

if [ ! -f "$CSV_FILE" ]; then
  echo "❌ CSV file not found: $CSV_FILE"
  echo "Usage: $0 [dataset_name] [model_name] [csv_file]"
  exit 1
fi

# Check if jq is installed
if ! command -v jq > /dev/null 2>&1; then
  echo "⚠️  jq not installed. Install with: brew install jq"
  echo "   Continuing without JSON formatting..."
  JQ_CMD="cat"
else
  JQ_CMD="jq ."
fi

echo "🚀 Training Anomaly Model"
echo "   Base URL: $BASE_URL"
echo "   Dataset Name: $DATASET_NAME"
echo "   Model Name: $MODEL_NAME"
echo "   CSV File: $CSV_FILE"
echo ""

# Step 1: Upload dataset
echo "📤 Step 1: Uploading dataset..."
UPLOAD_RESPONSE=$(curl -s -X POST "$BASE_URL/api/datasets" \
  -H "accept: application/json" \
  -H "Authorization: Bearer $WOODWIDE_API_KEY" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@$CSV_FILE;type=text/csv" \
  -F "name=$DATASET_NAME" \
  -F "overwrite=true")

echo "$UPLOAD_RESPONSE" | $JQ_CMD

DATASET_ID=$(echo "$UPLOAD_RESPONSE" | jq -r '.id // empty' 2>/dev/null)

if [ -z "$DATASET_ID" ] || [ "$DATASET_ID" = "null" ]; then
  echo ""
  echo "❌ Failed to upload dataset. Check the response above."
  exit 1
fi

echo ""
echo "✅ Dataset uploaded. ID: $DATASET_ID"
echo ""

# Step 2: Train anomaly model
echo "🎓 Step 2: Training anomaly model..."
TRAIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/models/anomaly/train?dataset_name=$DATASET_NAME" \
  -H "accept: application/json" \
  -H "Authorization: Bearer $WOODWIDE_API_KEY" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "model_name=$MODEL_NAME" \
  -d "overwrite=true")

echo "$TRAIN_RESPONSE" | $JQ_CMD

MODEL_ID=$(echo "$TRAIN_RESPONSE" | jq -r '.id // empty' 2>/dev/null)

if [ -z "$MODEL_ID" ] || [ "$MODEL_ID" = "null" ]; then
  echo ""
  echo "❌ Failed to start training. Check the response above."
  exit 1
fi

echo ""
echo "✅ Training started. Model ID: $MODEL_ID"
echo ""

# Step 3: Monitor training
echo "⏳ Step 3: Monitoring training progress..."
START_TIME=$(date +%s)
TIMEOUT=3000

while true; do
  STATUS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/models/$MODEL_ID" \
    -H "accept: application/json" \
    -H "Authorization: Bearer $WOODWIDE_API_KEY")

  TRAINING_STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.training_status // empty' 2>/dev/null)
  PROGRESS=$(echo "$STATUS_RESPONSE" | jq -r '.progress // empty' 2>/dev/null)

  if [ "$TRAINING_STATUS" = "COMPLETE" ]; then
    echo ""
    echo "🎉 Training completed!"
    echo ""
    echo "$STATUS_RESPONSE" | $JQ_CMD
    echo ""
    echo "📋 Add this to your .env.local:"
    echo "ANOMALY_MODEL_ID=$MODEL_ID"
    echo ""
    exit 0
  elif [ "$TRAINING_STATUS" = "FAILED" ]; then
    echo ""
    echo "❌ Training failed!"
    echo "$STATUS_RESPONSE" | $JQ_CMD
    exit 1
  fi

  CURRENT_TIME=$(date +%s)
  ELAPSED_TIME=$((CURRENT_TIME - START_TIME))

  if [ $ELAPSED_TIME -ge $TIMEOUT ]; then
    echo ""
    echo "⏱️  Training timed out after ${TIMEOUT} seconds"
    echo "   Check status manually: curl -X GET \"$BASE_URL/api/models/$MODEL_ID\" -H \"Authorization: Bearer $WOODWIDE_API_KEY\""
    exit 1
  fi

  if [ -n "$PROGRESS" ] && [ "$PROGRESS" != "null" ]; then
    PROGRESS_PCT=$(echo "$PROGRESS * 100" | bc -l 2>/dev/null | cut -d. -f1)
    printf "\r   Status: %s (%s%%) - Elapsed: %ds" "$TRAINING_STATUS" "$PROGRESS_PCT" "$ELAPSED_TIME"
  else
    printf "\r   Status: %s - Elapsed: %ds" "$TRAINING_STATUS" "$ELAPSED_TIME"
  fi

  sleep 5
done
