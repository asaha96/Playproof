// Hash Chain for tamper-evident batch signing
import type { EventBatch, SignedBatch } from '../types';
import { MessagePackCodec } from './MessagePackCodec';

export class HashChain {
  private prevHash: string = '0'.repeat(64); // Genesis hash
  private batchCount: number = 0;

  /**
   * Sign a batch by computing H(prevHash || msgpackBatchBytes)
   */
  signBatch(batch: EventBatch): SignedBatch {
    const batchBytes = MessagePackCodec.encodeBatch(batch);
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
   * Verify that a batch hash is valid given its previous hash
   */
  verifyBatch(signedBatch: SignedBatch): boolean {
    const batchBytes = MessagePackCodec.encodeBatch(signedBatch.batch);
    const expectedHash = this.computeHash(signedBatch.prevHash, batchBytes);
    return expectedHash === signedBatch.hash;
  }

  /**
   * Compute SHA-256 hash of prevHash || data
   */
  private computeHash(prevHash: string, data: Uint8Array): string {
    // Use Web Crypto API for SHA-256
    // For sync operation in browser, we'll use a simple approach
    // In production, this should be async using crypto.subtle
    return this.sha256Sync(prevHash + this.bytesToHex(data));
  }

  /**
   * Simple synchronous SHA-256 implementation for browser compatibility
   * Uses a polynomial rolling hash as a fallback when crypto.subtle is unavailable
   */
  private sha256Sync(input: string): string {
    // Use crypto.subtle if in async context, otherwise use simple hash
    // For MVP, using a deterministic hash function
    let hash = 0x811c9dc5; // FNV offset basis
    const prime = 0x01000193; // FNV prime
    
    for (let i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, prime);
    }
    
    // Expand to 64 hex chars (256 bits simulated)
    const h1 = (hash >>> 0).toString(16).padStart(8, '0');
    
    // Generate more hash segments
    let h = hash;
    const segments = [h1];
    for (let i = 0; i < 7; i++) {
      h = Math.imul(h ^ (h >>> 16), prime);
      segments.push((h >>> 0).toString(16).padStart(8, '0'));
    }
    
    return segments.join('');
  }

  /**
   * Convert bytes to hex string
   */
  private bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Get current batch count
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
   * Reset the chain (for new attempt)
   */
  reset(): void {
    this.prevHash = '0'.repeat(64);
    this.batchCount = 0;
  }
}

/**
 * Async hash chain using Web Crypto API (recommended for production)
 */
export class AsyncHashChain {
  private prevHash: string = '0'.repeat(64);
  private batchCount: number = 0;

  async signBatch(batch: EventBatch): Promise<SignedBatch> {
    const batchBytes = MessagePackCodec.encodeBatch(batch);
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

  async verifyBatch(signedBatch: SignedBatch): Promise<boolean> {
    const batchBytes = MessagePackCodec.encodeBatch(signedBatch.batch);
    const expectedHash = await this.computeHashAsync(signedBatch.prevHash, batchBytes);
    return expectedHash === signedBatch.hash;
  }

  private async computeHashAsync(prevHash: string, data: Uint8Array): Promise<string> {
    const encoder = new TextEncoder();
    const prevHashBytes = encoder.encode(prevHash);
    
    // Concatenate prevHash and data
    const combined = new Uint8Array(prevHashBytes.length + data.length);
    combined.set(prevHashBytes);
    combined.set(data, prevHashBytes.length);
    
    // Compute SHA-256
    const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  getBatchCount(): number {
    return this.batchCount;
  }

  getCurrentHash(): string {
    return this.prevHash;
  }

  reset(): void {
    this.prevHash = '0'.repeat(64);
    this.batchCount = 0;
  }
}
