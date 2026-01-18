/**
 * Test script for heuristic-based scoring
 * Run with: npx tsx test-scoring.ts
 */

const API_URL = process.env.API_URL || "http://localhost:3000";

/**
 * Generate realistic human-like movement data
 */
function generateHumanMovement(durationMs: number = 10000): Array<{
  x: number;
  y: number;
  timestamp: number;
}> {
  const movements: Array<{ x: number; y: number; timestamp: number }> = [];
  let x = 100;
  let y = 100;
  let timestamp = 0;

  // Simulate human-like movement with:
  // - Some jitter/micro-corrections
  // - Variable speed
  // - Occasional pauses
  // - Curved paths (not perfectly straight)

  while (timestamp < durationMs) {
    // Add some randomness to movement
    const dx = (Math.random() - 0.5) * 20 + Math.sin(timestamp / 500) * 10;
    const dy = (Math.random() - 0.5) * 20 + Math.cos(timestamp / 500) * 10;

    x += dx;
    y += dy;

    // Occasional pause (human hesitation)
    const pause = Math.random() < 0.05 ? 200 + Math.random() * 300 : 0;
    timestamp += 16.67 + pause; // ~60fps with occasional pauses

    movements.push({ x, y, timestamp });
  }

  return movements;
}

/**
 * Generate bot-like movement (too perfect)
 */
function generateBotMovement(durationMs: number = 10000): Array<{
  x: number;
  y: number;
  timestamp: number;
}> {
  const movements: Array<{ x: number; y: number; timestamp: number }> = [];
  const startX = 100;
  const startY = 100;
  const endX = 500;
  const endY = 400;
  const steps = Math.floor(durationMs / 16.67); // 60fps

  // Perfectly straight line, constant speed
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = startX + (endX - startX) * t;
    const y = startY + (endY - startY) * t;
    movements.push({
      x,
      y,
      timestamp: i * 16.67,
    });
  }

  return movements;
}

async function testScoring(
  movements: Array<{ x: number; y: number; timestamp: number }>,
  label: string
) {
  const telemetry = {
    sessionId: `test_${Date.now()}_${label}`,
    gameType: "bubble-pop" as const,
    deviceType: "mouse" as const,
    durationMs: movements[movements.length - 1]?.timestamp || 10000,
    movements,
    clicks: [
      { x: 300, y: 200, timestamp: 2000, targetHit: true },
      { x: 400, y: 300, timestamp: 5000, targetHit: true },
      { x: 350, y: 250, timestamp: 8000, targetHit: false },
    ],
    hits: 2,
    misses: 1,
  };

  console.log(`\n🧪 Testing: ${label}`);
  console.log(`   Movements: ${movements.length}`);
  console.log(`   Duration: ${telemetry.durationMs}ms`);

  try {
    const response = await fetch(`${API_URL}/api/v1/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(telemetry),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const result = await response.json();

    console.log(`\n✅ Result:`);
    console.log(`   Decision: ${result.decision.toUpperCase()}`);
    console.log(`   Anomaly Score: ${result.anomaly.anomalyScore.toFixed(2)}`);
    console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`   Model: ${result.anomaly.modelId}`);
    console.log(`   Latency: ${result.latencyMs.toFixed(1)}ms`);
    console.log(`\n   Key Features:`);
    console.log(`   - Path Efficiency: ${result.featureSummary.pathEfficiency?.toFixed(3)}`);
    console.log(`   - Smoothness: ${result.featureSummary.controlSmoothnessScore?.toFixed(3)}`);
    console.log(`   - Avg Speed: ${result.featureSummary.avgSpeed?.toFixed(1)} px/s`);
    console.log(`   - Jitter Ratio: ${result.featureSummary.smallJitterRatio?.toFixed(3)}`);

    return result;
  } catch (error) {
    console.error(`❌ Error:`, error);
    throw error;
  }
}

async function main() {
  console.log("🚀 Testing PlayProof Scoring API");
  console.log(`   API URL: ${API_URL}\n`);

  // Test 1: Human-like movement
  const humanMovements = generateHumanMovement(10000);
  await testScoring(humanMovements, "human-like");

  // Test 2: Bot-like movement (too perfect)
  const botMovements = generateBotMovement(10000);
  await testScoring(botMovements, "bot-like");

  // Test 3: Edge case - very short session
  const shortMovements = generateHumanMovement(2000);
  await testScoring(shortMovements, "short-session");

  console.log("\n✨ All tests complete!");
}

main().catch(console.error);
