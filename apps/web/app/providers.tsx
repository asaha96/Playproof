"use client";

import { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth } from "@clerk/nextjs";
import { PlayproofProvider } from "playproof/react";
import { useStoreUserEffect } from "../hooks/useStoreUserEffect";

const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL as string
);

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
