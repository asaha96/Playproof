// MessagePack Codec for efficient binary serialization
import { encode, decode } from '@msgpack/msgpack';
import type { EventBatch, SignedBatch } from '../types';

export class MessagePackCodec {
  /**
   * Encode an event batch to MessagePack binary format
   */
  static encodeBatch(batch: EventBatch): Uint8Array {
    return encode(batch);
  }

  /**
   * Decode a MessagePack binary to event batch
   */
  static decodeBatch(data: Uint8Array): EventBatch {
    return decode(data) as EventBatch;
  }

  /**
   * Encode a signed batch (batch + hash metadata) for transmission
   */
  static encodeSignedBatch(signedBatch: SignedBatch): Uint8Array {
    // Encode the batch data separately
    const batchData = this.encodeBatch(signedBatch.batch);
    
    // Create envelope with hash chain info
    const envelope = {
      data: batchData,
      hash: signedBatch.hash,
      prevHash: signedBatch.prevHash,
    };
    
    return encode(envelope);
  }

  /**
   * Decode a signed batch envelope
   */
  static decodeSignedBatch(data: Uint8Array): SignedBatch {
    const envelope = decode(data) as {
      data: Uint8Array;
      hash: string;
      prevHash: string;
    };
    
    return {
      batch: this.decodeBatch(envelope.data),
      hash: envelope.hash,
      prevHash: envelope.prevHash,
    };
  }

  /**
   * Get the raw batch bytes for hash chain computation
   */
  static getBatchBytes(batch: EventBatch): Uint8Array {
    return this.encodeBatch(batch);
  }
}
