"use client";

/**
 * PlayproofProvider
 * Provides the client_key to all Playproof components in the tree
 */

import React, { useMemo } from 'react';
import { PlayproofContext, type PlayproofContextValue } from './context';

export interface PlayproofProviderProps {
  /**
   * Your Playproof API key (client_key)
   * Get this from the Developer page in your Playproof dashboard
   */
  client_key: string;
  children: React.ReactNode;
}

/**
 * Provider component that supplies the API key to all Playproof components
 * 
 * @example
 * ```tsx
 * import { PlayproofProvider } from 'playproof/react';
 * 
 * export default function App({ children }) {
 *   return (
 *     <PlayproofProvider client_key="pp_your_api_key_here">
 *       {children}
 *     </PlayproofProvider>
 *   );
 * }
 * ```
 */
export function PlayproofProvider({ client_key, children }: PlayproofProviderProps) {
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
