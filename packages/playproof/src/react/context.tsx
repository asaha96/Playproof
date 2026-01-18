/**
 * Playproof React Context
 * Stores the client_key for API authentication
 */

import { createContext, useContext } from 'react';

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

export default PlayproofContext;
