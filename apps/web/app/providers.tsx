"use client";

import { ReactNode, createContext, useMemo, useContext } from "react";
import { ThemeProvider } from "next-themes";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth } from "@clerk/nextjs";
import { useStoreUserEffect } from "../hooks/useStoreUserEffect";

const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL as string
);

// TODO: Replace this inlined PlayproofProvider with the package import once 
// the playproof/react module resolution issue is fixed in the monorepo.
// See: https://github.com/asaha96/Playproof/pull/10
// Original import: import { PlayproofProvider, usePlayproof, PlayproofContext } from 'playproof/react';
//
// Inline PlayproofContext to avoid module resolution issues with playproof/react
// This is a workaround until the playproof package export issue is resolved
export interface PlayproofContextValue {
  client_key: string;
}

export const PlayproofContext = createContext<PlayproofContextValue | null>(null);

/**
 * Hook to access the Playproof context
 * @throws Error if used outside of PlayproofProvider
 */
export function usePlayproof(): PlayproofContextValue {
  const context = useContext(PlayproofContext);
  if (!context) {
    throw new Error(
      'usePlayproof must be used within a PlayproofProvider. ' +
      'Wrap your app with <PlayproofProvider client_key="...">.'
    );
  }
  return context;
}

function PlayproofProvider({ client_key, children }: { client_key: string; children: ReactNode }) {
  const value = useMemo<PlayproofContextValue>(
    () => ({ client_key }),
    [client_key]
  );

  return (
    <PlayproofContext.Provider value={value}>
      {children}
    </PlayproofContext.Provider>
  );
}

/**
 * Component that syncs the authenticated user to Convex.
 * Must be rendered inside ConvexProviderWithClerk.
 */
function UserSync({ children }: { children: ReactNode }) {
  useStoreUserEffect();
  return <>{children}</>;
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  // Client key for Playproof SDK - dashboard uses preview mode so this can be empty
  const playproofClientKey = process.env.NEXT_PUBLIC_PLAYPROOF_CLIENT_KEY || "";

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <PlayproofProvider client_key={playproofClientKey}>
          <UserSync>{children}</UserSync>
        </PlayproofProvider>
      </ConvexProviderWithClerk>
    </ThemeProvider>
  );
}
