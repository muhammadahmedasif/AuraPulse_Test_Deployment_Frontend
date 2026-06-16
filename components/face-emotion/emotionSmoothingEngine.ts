/**
 * emotionSmoothingEngine.ts
 * Handles temporal smoothing, spike rejection, and stability detection.
 * 
 * Window of 12 frames at ~20fps = ~0.6 seconds of history.
 * This is long enough to filter camera jitter but short enough
 * to respond to real emotional changes within 1 second.
 */

export class EmotionSmoothingEngine {
  private windowSize: number;
  private history: number[] = [];
  private lastStableScore: number | null = null;
  private stableSince: number = 0;
  private stabilityThresholdMs: number;

  constructor(windowSize: number = 12, stabilityThresholdMs: number = 3000) {
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

    // 2. Spike rejection: remove single-frame outliers
    // Only activate when we have enough data and significant variance
    let validScores = [...this.history];
    if (validScores.length >= 5) {
      const mean = validScores.reduce((a, b) => a + b) / validScores.length;
      const variance = validScores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / validScores.length;
      const stdDev = Math.sqrt(variance);
      
      // Only filter when there's real variance (stdDev > 4 points)
      // and only remove extreme outliers (> 2.5 SD)
      if (stdDev > 4) {
        const filtered = validScores.filter(s => Math.abs(s - mean) <= 2.5 * stdDev);
        if (filtered.length >= 3) {
          validScores = filtered;
        }
      }
    }

    // 3. Weighted median-like average
    // Sort and trim top/bottom 10% for robustness, then weighted average the rest
    let smoothedScore: number;
    if (validScores.length <= 3) {
      smoothedScore = validScores.reduce((a, b) => a + b) / validScores.length;
    } else {
      // Weighted average: recent frames count more
      let totalWeight = 0;
      let weightedSum = 0;
      for (let i = 0; i < validScores.length; i++) {
        const weight = 1 + i; // older=1, newest=N
        weightedSum += validScores[i] * weight;
        totalWeight += weight;
      }
      smoothedScore = weightedSum / totalWeight;
    }

    // 4. Stability detection: has the score settled?
    let isStable = false;
    if (this.lastStableScore === null || Math.abs(smoothedScore - this.lastStableScore) > 5) {
      // Score changed significantly — restart stability timer
      this.lastStableScore = smoothedScore;
      this.stableSince = timestamp;
    } else {
      // Score is hovering within ±5 points
      if (timestamp - this.stableSince >= this.stabilityThresholdMs) {
        isStable = true;
      }
    }

    return { smoothedScore, isStable };
  }

  public reset(): void {
    this.history = [];
    this.lastStableScore = null;
    this.stableSince = 0;
  }
}
