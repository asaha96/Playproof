/**
 * Shared utilities and contracts for PlayProof
 */
export declare const VERSION = "0.1.0";
/** Verification result types */
export declare const VerificationResult: {
    readonly PASS: "PASS";
    readonly FAIL: "FAIL";
    readonly REGENERATE: "REGENERATE";
    readonly STEP_UP: "STEP_UP";
};
export type VerificationResultValue = typeof VerificationResult[keyof typeof VerificationResult];
export * from './types.js';
//# sourceMappingURL=index.d.ts.map