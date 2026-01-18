/**
 * Pixi telemetry buffer for event table batching
 */

import type { TelemetryBatch, TelemetryConfig, TelemetryRow } from '@playproof/shared/telemetry';

const DEFAULT_CONFIG: TelemetryConfig = {
    batchIntervalMs: 250,
    batchSize: 500
};

export class TelemetryBuffer {
    private config: TelemetryConfig;
    private rows: TelemetryRow[];
    private seq: number;
    private lastFlushTime: number;

    constructor(config: Partial<TelemetryConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.rows = [];
        this.seq = 0;
        this.lastFlushTime = performance.now();
    }

    reset(): void {
        this.rows = [];
        this.seq = 0;
        this.lastFlushTime = performance.now();
    }

    nextSeq(): number {
        return this.seq++;
    }

    add(row: Omit<TelemetryRow, 'seq'>): void {
        this.rows.push({ ...row, seq: this.seq++ });
    }

    shouldFlush(): boolean {
        const now = performance.now();
        if (this.rows.length === 0) return false;
        if (this.rows.length >= this.config.batchSize) return true;
        return now - this.lastFlushTime >= this.config.batchIntervalMs;
    }

    flush(attemptId: string, gameId: string): TelemetryBatch | null {
        if (this.rows.length === 0) return null;

        const batch: TelemetryBatch = {
            attemptId,
            gameId,
            seqStart: this.rows[0].seq,
            seqEnd: this.rows[this.rows.length - 1].seq,
            rows: this.rows
        };

        this.rows = [];
        this.lastFlushTime = performance.now();
        return batch;
    }
}
