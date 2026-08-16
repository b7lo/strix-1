export interface ReplayClock {
  now(): number;
  reset(): void;
  advanceTo(tMs: number): void;
}

export class VirtualReplayClock implements ReplayClock {
  private currentMs = 0;

  now(): number {
    return this.currentMs;
  }

  reset(): void {
    this.currentMs = 0;
  }

  advanceTo(tMs: number): void {
    if (!Number.isFinite(tMs) || tMs < this.currentMs) {
      throw new Error(`Replay clock cannot move backwards: ${tMs} < ${this.currentMs}`);
    }
    this.currentMs = tMs;
  }
}
