"use client";

import { useUser } from "@clerk/nextjs";
import { useConvexAuth, useMutation } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "@/convex/_generated/api";

/**
 * Hook that syncs the authenticated Clerk user to the Convex database.
 * Call this once at the app level (e.g., in providers or layout).
 * 
 * This ensures that whenever a user signs in via Clerk, their data
 * is upserted into the Convex `users` table.
 */
export function useStoreUserEffect() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { user } = useUser();
  const upsertViewer = useMutation(api.users.upsertViewer);
  
  // Track whether we've already synced this session to avoid duplicate calls
  const hasSyncedRef = useRef(false);

  useEffect(() => {
    // Don't sync if:
    // - Still loading auth state
    // - Not authenticated
    // - No Clerk user data
    // - Already synced this session
    if (isLoading || !isAuthenticated || !user || hasSyncedRef.current) {
      return;
    }

    // Sync the user to Convex
    const syncUser = async () => {
      try {
        await upsertViewer();
        hasSyncedRef.current = true;
        console.log("[useStoreUserEffect] User synced to Convex");
      } catch (error) {
        console.error("[useStoreUserEffect] Failed to sync user:", error);
        // Reset so we can retry on next render
        hasSyncedRef.current = false;
      }
    };

    syncUser();
  }, [isAuthenticated, isLoading, user, upsertViewer]);

  // Reset sync flag when user changes (e.g., signs out and back in)
  useEffect(() => {
    if (!isAuthenticated) {
      hasSyncedRef.current = false;
    }
  }, [isAuthenticated]);

  return { isAuthenticated, isLoading };
}
