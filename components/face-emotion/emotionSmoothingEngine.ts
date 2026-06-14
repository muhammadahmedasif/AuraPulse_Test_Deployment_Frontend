/**
 * emotionSmoothingEngine.ts
 * Handles temporal smoothing, spike rejection, and stability detection.
 * 
 * Uses a gentler approach that preserves natural emotional range
 * while still filtering camera noise and single-frame glitches.
 */

export class EmotionSmoothingEngine {
  private windowSize: number;
  private history: number[] = [];
  private lastStableScore: number | null = null;
  private stableSince: number = 0;
  private stabilityThresholdMs: number = 3000;

  constructor(windowSize: number = 8, stabilityThresholdMs: number = 3000) {
    this.windowSize = windowSize;
    this.stabilityThresholdMs = stabilityThresholdMs;
  }

  public processScore(rawScore: number, timestamp: number): {
    smoothedScore: number;
    isStable: boolean;
  } {
    // 1. Add to history
    this.history.push(rawScore);
    if (this.history.length > this.windowSize) {
      this.history.shift();
    }

    // 2. Spike Rejection: only reject extreme outliers (> 2.5 SD)
    // Less aggressive than before to preserve real emotion shifts
    let validScores = this.history;
    if (this.history.length >= 4) {
      const mean = this.history.reduce((a, b) => a + b) / this.history.length;
      const variance = this.history.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / this.history.length;
      const stdDev = Math.sqrt(variance);
      
      // Only filter truly extreme spikes (2.5 SD instead of 2)
      if (stdDev > 3) { // Only filter when there's meaningful variance
        validScores = this.history.filter(s => Math.abs(s - mean) <= 2.5 * stdDev);
        if (validScores.length < 2) validScores = this.history; // Don't over-filter
      }
    }

    // 3. Weighted rolling average: recent scores matter more
    let smoothedScore: number;
    if (validScores.length <= 2) {
      smoothedScore = validScores.reduce((a, b) => a + b) / validScores.length;
    } else {
      // Give more weight to recent scores (linear weighting)
      let totalWeight = 0;
      let weightedSum = 0;
      for (let i = 0; i < validScores.length; i++) {
        const weight = 1 + i; // Earlier = 1, latest = N
        weightedSum += validScores[i] * weight;
        totalWeight += weight;
      }
      smoothedScore = weightedSum / totalWeight;
    }

    // 4. Stability Detection
    let isStable = false;
    if (this.lastStableScore === null || Math.abs(smoothedScore - this.lastStableScore) > 6) {
      // Changed significantly — reset stability timer
      this.lastStableScore = smoothedScore;
      this.stableSince = timestamp;
    } else {
      // Score is stable within ±6 points
      if (timestamp - this.stableSince >= this.stabilityThresholdMs) {
        isStable = true;
      }
    }

    return {
      smoothedScore,
      isStable
    };
  }

  public reset(): void {
    this.history = [];
    this.lastStableScore = null;
    this.stableSince = 0;
  }
}
