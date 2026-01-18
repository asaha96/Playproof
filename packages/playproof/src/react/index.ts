/**
 * Playproof React Components
 * 
 * @example
 * ```tsx
 * import { PlayproofProvider, Playproof } from 'playproof/react';
 * 
 * // In your app root
 * function App({ children }) {
 *   return (
 *     <PlayproofProvider client_key="pp_your_api_key">
 *       {children}
 *     </PlayproofProvider>
 *   );
 * }
 * 
 * // In your verification page
 * function VerifyPage() {
 *   return (
 *     <Playproof
 *       deploymentId="your_deployment_id"
 *       onSuccess={(result) => console.log('Verified!', result)}
 *       onFailure={(result) => console.log('Failed', result)}
 *     />
 *   );
 * }
 * ```
 */

export { PlayproofProvider, type PlayproofProviderProps } from './provider';
export { Playproof, type PlayproofProps } from './playproof';
export { usePlayproof, PlayproofContext, type PlayproofContextValue } from './context';

// Re-export types that consumers might need
export type { 
  VerificationResult, 
  PlayproofTheme, 
  GameId,
  PointerTelemetryEvent,
  BehaviorData,
} from '../types';
