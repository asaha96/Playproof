/**
 * Hash Chain for Batch Signing
 * 
 * Tamper-evident signing using hash chains.
 * 
 * @packageDocumentation
 */

import type { EventBatch, SignedBatch } from '../types';

const GENESIS_HASH = '0'.repeat(64);

/**
 * Simple FNV-1a based hash function (sync)
 * For production, use Web Crypto API
 */
function fnvHash(input: string): string {
  let hash = 0x811c9dc5;
  const prime = 0x01000193;

  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, prime);
  }

  // Expand to 64 hex chars
  const segments: string[] = [];
  let h = hash;
  for (let i = 0; i < 8; i++) {
    segments.push((h >>> 0).toString(16).padStart(8, '0'));
    h = Math.imul(h ^ (h >>> 16), prime);
  }

  return segments.join('');
}

/**
 * Convert bytes to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Encode batch to bytes (simple JSON for now)
 */
function encodeBatch(batch: EventBatch): Uint8Array {
  const json = JSON.stringify(batch);
  return new TextEncoder().encode(json);
}

/**
 * Hash chain for tamper-evident batch signing
 */
export class HashChain {
  private prevHash: string = GENESIS_HASH;
  private batchCount = 0;

  /**
   * Sign a batch with hash chain
   */
  signBatch(batch: EventBatch): SignedBatch {
    const batchBytes = encodeBatch(batch);
    const hash = this.computeHash(this.prevHash, batchBytes);

    const signedBatch: SignedBatch = {
      batch,
      hash,
      prevHash: this.prevHash,
    };

    // Update chain state
    this.prevHash = hash;
    this.batchCount++;

    return signedBatch;
  }

  /**
   * Verify a batch hash
   */
  verifyBatch(signedBatch: SignedBatch): boolean {
    const batchBytes = encodeBatch(signedBatch.batch);
    const expectedHash = this.computeHash(signedBatch.prevHash, batchBytes);
    return expectedHash === signedBatch.hash;
  }

  /**
   * Compute hash: H(prevHash || data)
   */
  private computeHash(prevHash: string, data: Uint8Array): string {
    return fnvHash(prevHash + bytesToHex(data));
  }

  /**
   * Get batch count
   */
  getBatchCount(): number {
    return this.batchCount;
  }

  /**
   * Get current chain head hash
   */
  getCurrentHash(): string {
    return this.prevHash;
  }

  /**
   * Reset the chain
   */
  reset(): void {
    this.prevHash = GENESIS_HASH;
    this.batchCount = 0;
  }
}

/**
 * Async hash chain using Web Crypto API
 */
export class AsyncHashChain {
  private prevHash: string = GENESIS_HASH;
  private batchCount = 0;

  /**
   * Sign a batch asynchronously
   */
  async signBatch(batch: EventBatch): Promise<SignedBatch> {
    const batchBytes = encodeBatch(batch);
    const hash = await this.computeHashAsync(this.prevHash, batchBytes);

    const signedBatch: SignedBatch = {
      batch,
      hash,
      prevHash: this.prevHash,
    };

    this.prevHash = hash;
    this.batchCount++;

    return signedBatch;
  }

  /**
   * Verify a batch hash asynchronously
   */
  async verifyBatch(signedBatch: SignedBatch): Promise<boolean> {
    const batchBytes = encodeBatch(signedBatch.batch);
    const expectedHash = await this.computeHashAsync(signedBatch.prevHash, batchBytes);
    return expectedHash === signedBatch.hash;
  }

  /**
   * Compute SHA-256 hash asynchronously
   */
  private async computeHashAsync(prevHash: string, data: Uint8Array): Promise<string> {
    const encoder = new TextEncoder();
    const prevHashBytes = encoder.encode(prevHash);

    // Concatenate
    const combined = new Uint8Array(prevHashBytes.length + data.length);
    combined.set(prevHashBytes);
    combined.set(data, prevHashBytes.length);

    // SHA-256
    const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  getBatchCount(): number {
    return this.batchCount;
  }

  getCurrentHash(): string {
    return this.prevHash;
  }

  reset(): void {
    this.prevHash = GENESIS_HASH;
    this.batchCount = 0;
  }
}

export { GENESIS_HASH };
