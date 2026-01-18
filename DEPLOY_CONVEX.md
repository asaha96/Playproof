# Deploy Convex Functions

## Error
```
Could not find public function for 'sessions:timeSeries'. 
Did you forget to run `npx convex dev` or `npx convex deploy`?
```

## Solution

The `timeSeries` function exists in `convex/sessions.ts` but needs to be deployed to Convex cloud.

### Option 1: Deploy to Production
```bash
cd /Users/aritrasaha/Desktop/Playproof
npx convex deploy
```

### Option 2: Run Development Mode (Recommended for local dev)
```bash
cd /Users/aritrasaha/Desktop/Playproof
npx convex dev
```

This will:
- Deploy all Convex functions including `timeSeries`
- Watch for changes and auto-deploy
- Generate TypeScript types

### After Deployment

Once deployed, the analytics dashboard will work and the `timeSeries` function will be available.

**Note:** You may need to log in to Convex if you haven't already:
```bash
npx convex login
```
