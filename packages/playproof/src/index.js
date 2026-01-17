/**
 * Playproof SDK - UMD Bundle Entry
 * Universal module definition for browser usage
 */

import { Playproof } from './playproof.js';
export { Playproof };
export default Playproof;

// Expose globally for script tag usage
if (typeof window !== 'undefined') {
    window.Playproof = Playproof;
}
