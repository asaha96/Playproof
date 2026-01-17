# Dashboard Metrics Analysis

## Current Schema (sessions table)

### ✅ **ESSENTIAL METRICS** (Keep)
1. **`suspectScore`** - Core bot detection score (0-1)
   - **Why**: Primary metric for human vs bot classification
   - **Used in**: Analytics dashboard, session results

2. **`durationMs`** - Session completion time
   - **Why**: User experience metric, helps detect automation
   - **Used in**: Analytics dashboard (avg session time)

3. **`startAt` / `endAt`** - Timestamps
   - **Why**: Time-series analysis, session ordering
   - **Used in**: Recent sessions table, time-based queries

4. **`minigameId`** - Which game was played
   - **Why**: Per-game analytics, A/B testing
   - **Used in**: Analytics dashboard, minigames page

### ⚠️ **PARTIALLY REDUNDANT** (Simplify)

#### Client Info - Too Granular
**Current**: 20+ fields in `clientInfo` object
- `deviceType`, `deviceVendor`, `deviceModel`
- `browserName`, `browserVersion`
- `osName`, `osVersion`
- `userAgent` (contains all of the above)
- `ipAddress`
- `language`
- `location` (country, region, city, timezone, lat/lng)
- `requestHeaders` (array)
- `cookies` (array)

**Recommendation**: 
- **Keep**: `userAgent`, `ipAddress`, `country` (from location)
- **Remove**: Redundant parsed fields (deviceType, browserName, etc. can be parsed from userAgent when needed)
- **Remove**: `requestHeaders` and `cookies` (privacy/security risk, rarely needed)

**Reason**: Most fields are redundant with `userAgent`. Only parse when needed for specific analytics.

### ❌ **MISSING METRICS** (Add)

1. **Game-specific data**
   - `gameId` (which specific game: 'mini-golf', 'basketball', etc.)
   - `gameResult` ('success', 'failure', 'timeout')
   - `attemptDetails` (JSON blob with game-specific metrics)
   - `confidenceScore` (separate from suspectScore - how confident we are)

2. **Behavioral signals**
   - `mouseMovements` count
   - `clickTimings` array length
   - `trajectories` count
   - `accuracy` (if applicable to game)

3. **User experience**
   - `completionRate` (did they finish the game?)
   - `retryCount` (how many attempts before passing)

4. **Risk signals**
   - `riskFlags` (array of detected anomalies)
   - `deviceFingerprint` hash (for pattern detection)

## Current Dashboard Display

### Analytics Page Shows:
1. ✅ **Human pass rate** - Essential
2. ✅ **Bot detections** - Essential  
3. ✅ **Avg. session time** - Essential
4. ❌ **Signal stability** - Placeholder (no real data)
5. ❌ **Top risk signals** - Hardcoded fake data
6. ✅ **Recent sessions** - Essential (but missing game name/details)

### Minigames Page Shows:
1. ✅ **Session count** - Essential
2. ✅ **Last updated** - Useful
3. ✅ **Ready status** - Useful
4. ❌ **Experiment queue** - Placeholder (hardcoded)
5. ❌ **Signals toolkit** - Placeholder (hardcoded)

## Recommendations

### Schema Changes

```typescript
sessions: defineTable({
  minigameId: v.id("minigames"),
  
  // Core metrics (KEEP)
  startAt: v.number(),
  endAt: v.number(),
  durationMs: v.number(),
  suspectScore: v.number(), // 0-1, bot likelihood
  
  // Game details (ADD)
  gameId: v.string(), // 'mini-golf', 'basketball', etc.
  gameResult: v.union(v.literal('success'), v.literal('failure'), v.literal('timeout')),
  confidenceScore: v.optional(v.number()), // 0-1, how confident in result
  attemptDetails: v.optional(v.any()), // Game-specific JSON
  
  // Behavioral signals (ADD)
  mouseMovements: v.optional(v.number()),
  clickCount: v.optional(v.number()),
  trajectoryCount: v.optional(v.number()),
  accuracy: v.optional(v.number()),
  
  // User experience (ADD)
  completionRate: v.optional(v.number()), // 0-1
  retryCount: v.optional(v.number()),
  
  // Risk signals (ADD)
  riskFlags: v.optional(v.array(v.string())), // ['synthetic_cursor', 'repeat_latency', etc.]
  
  // Simplified client info (SIMPLIFY)
  clientInfo: v.optional(
    v.object({
      userAgent: v.optional(v.string()), // Parse when needed
      ipAddress: v.optional(v.string()),
      country: v.optional(v.string()), // From location
      language: v.optional(v.string()),
    })
  ),
})
```

### Remove from Schema
- ❌ All parsed device/browser/OS fields (redundant with userAgent)
- ❌ Detailed location (lat/lng, city, region - privacy concern)
- ❌ `requestHeaders` array (security/privacy risk)
- ❌ `cookies` array (security/privacy risk)
- ❌ `timezone` (can derive from country if needed)

### Dashboard Improvements Needed

1. **Replace placeholders with real data**:
   - Signal stability chart (needs time-series suspectScore data)
   - Top risk signals (needs `riskFlags` aggregation)

2. **Add missing views**:
   - Per-game analytics breakdown
   - Geographic distribution (if keeping country)
   - Device/browser breakdown (parse userAgent on-demand)
   - Time-series trends (pass rate over time)

3. **Remove unused features**:
   - Experiment queue (not implemented)
   - Signals toolkit (not implemented)

## Summary

**Keep**: Core verification metrics (suspectScore, duration, timestamps, minigameId)
**Simplify**: Client info (reduce to 4 fields from 20+)
**Add**: Game-specific metrics, behavioral signals, risk flags
**Remove**: Redundant parsed fields, privacy-sensitive data (headers, cookies, precise location)
