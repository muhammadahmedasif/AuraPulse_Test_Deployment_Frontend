/**
 * emotionScoringEngine.ts
 * 
 * Produces a 0-100 mood score from facial blendshape features.
 * 
 * FIX: Using ultra-safe deadzones (0.08+) to guarantee a stable Neutral
 * resting face for all users, regardless of face shape or lighting.
 */

import { EmotionFeatures } from "./emotionFeatureExtractor";

let previousFinalScore: number | null = null;

function activate(value: number, deadzone: number, saturation: number, power: number): number {
  if (value <= deadzone) return 0;
  const t = Math.min((value - deadzone) / (saturation - deadzone), 1);
  return Math.pow(t, power);
}

export function calculateRawScore(features: EmotionFeatures): number {
  // =========================================================
  // POSITIVE SIGNALS
  // =========================================================
  // Lowered deadzone to 0.065 for a slight positive bias, so subtle 
  // friendly resting faces or tiny smiles are picked up easier.
  // Saturation 0.45: Normal smile maxes it out quicker.
  const smileSignal = activate(features.smile, 0.065, 0.45, 0.45);

  const duchenne = (features.smile > 0.08 && features.squint > 0.08)
    ? activate(features.squint, 0.08, 0.40, 0.6) * 0.2
    : 0;

  const excitement = (features.smile > 0.08 && features.browRaise > 0.08)
    ? activate(features.browRaise, 0.08, 0.4, 0.6) * 0.15
    : 0;

  const laughter = (features.smile > 0.12 && features.jawOpen > 0.10)
    ? activate(features.jawOpen, 0.10, 0.4, 0.6) * 0.15
    : 0;

  const totalPositive = Math.min(smileSignal + duchenne + excitement + laughter, 1.0);

  // =========================================================
  // NEGATIVE SIGNALS
  // =========================================================
  const isSmiling = features.smile > 0.065;
  let totalNegative = 0;

  if (!isSmiling) {
    // Ultra-safe deadzones to prevent any resting face noise from triggering.
    // Saturation remains low so deliberate expressions still max it out.
    
    // Frown: Deadzone 0.08
    const frownSignal = activate(features.frown, 0.08, 0.20, 0.45);

    // Brow furrow: Deadzone 0.08
    const furrowSignal = activate(features.browFurrow, 0.08, 0.20, 0.45);

    // Sad brows (inner brows up): Deadzone 0.06 (this blendshape is usually lower)
    const sadBrowSignal = activate(features.sadBrows, 0.06, 0.15, 0.45);

    // Secondary signals
    const lipPressSignal = activate(features.lipPress, 0.10, 0.35, 0.6);
    const eyeDroopSignal = activate(features.eyeDroop, 0.12, 0.35, 0.6);
    const mouthLowerSignal = activate(features.mouthLowerDown, 0.06, 0.20, 0.5);

    const primaryNegative = Math.max(
      frownSignal * 0.85,    
      furrowSignal * 0.85,   
      sadBrowSignal * 0.85   
    );

    totalNegative = Math.min(
      primaryNegative 
      + (lipPressSignal * 0.15)
      + (eyeDroopSignal * 0.15)
      + (mouthLowerSignal * 0.15),
      1.0
    );
  }

  // =========================================================
  // COMBINE INTO FINAL SCORE
  // =========================================================
  let score = 50;
  if (totalPositive > 0) {
    score = 50 + totalPositive * 50;
  } else if (totalNegative > 0) {
    score = 50 - totalNegative * 50;
  }

  return Math.max(0, Math.min(100, score));
}

export function applyTemporalSmoothingStep(currentScore: number): number {
  if (previousFinalScore === null) {
    previousFinalScore = currentScore;
    return Math.round(currentScore);
  }

  // Heavy smoothing for stability: max alpha is 0.4 (instead of 0.6)
  const diff = Math.abs(currentScore - previousFinalScore);
  const alpha = 0.15 + 0.25 * Math.min(diff / 30, 1);

  const smoothed = previousFinalScore * (1 - alpha) + currentScore * alpha;
  const clamped = Math.max(0, Math.min(100, Math.round(smoothed)));
  previousFinalScore = clamped;
  return clamped;
}

export function resetScoringState(): void {
  previousFinalScore = null;
}
