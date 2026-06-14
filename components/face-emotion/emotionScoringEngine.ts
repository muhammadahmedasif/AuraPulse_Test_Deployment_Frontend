/**
 * emotionScoringEngine.ts
 * 
 * Produces a 0-100 mood score from facial blendshape features.
 * 
 * Design principles:
 * - Natural resting face → 49-51 (Neutral)
 * - Subtle natural smile → 56-65 (Calm)
 * - Moderate smile → 65-80 (Happy)
 * - Big smile / laugh → 80-100 (Excited)
 * - Subtle sadness / unease → 36-48 (Uneasy)
 * - Moderate frown / stress → 16-35 (Stressed)
 * - Strong negative signals → 0-15 (Down)
 * 
 * Key insight: MediaPipe blendshape values for NEGATIVE expressions are very small.
 * A natural frown is typically 0.02-0.10, natural sadBrows is 0.01-0.08.
 * The system uses very low deadzones and aggressive amplification for negatives.
 */

import { EmotionFeatures } from "./emotionFeatureExtractor";

let previousFinalScore: number | null = null;

/**
 * Maps a raw blendshape value through a soft curve that:
 * - Ignores true noise (< deadzone)
 * - Amplifies small natural signals (power < 1 = concave curve)
 * - Saturates at large values to prevent overshoot
 */
function softCurve(value: number, deadzone: number, saturation: number, power: number = 0.5): number {
  if (value <= deadzone) return 0;
  const normalized = Math.min((value - deadzone) / (saturation - deadzone), 1);
  return Math.pow(normalized, power);
}

export function calculateRawScore(features: EmotionFeatures): number {
  // === POSITIVE SIGNALS ===
  
  // Smile: deadzone at 0.04 to filter the small residual "smile" MediaPipe 
  // reports on a completely neutral resting face (usually 0.01-0.03)
  const smileStrength = softCurve(features.smile, 0.04, 0.50, 0.5);

  // Cheek raise (Duchenne smile indicator) — squint during smile is POSITIVE
  const genuineSmileBoost = (features.smile > 0.06 && features.squint > 0.04)
    ? softCurve(features.squint, 0.04, 0.5, 0.6) * 0.25
    : 0;

  // Brow raise with smile = excitement
  const excitementBoost = (features.smile > 0.06 && features.browRaise > 0.04)
    ? softCurve(features.browRaise, 0.04, 0.4, 0.6) * 0.15
    : 0;

  // Jaw open with smile = laughter/excitement
  const laughBoost = (features.smile > 0.08 && features.jawOpen > 0.06)
    ? softCurve(features.jawOpen, 0.06, 0.5, 0.6) * 0.15
    : 0;

  const totalPositive = Math.min(smileStrength + genuineSmileBoost + excitementBoost + laughBoost, 1.0);

  // === NEGATIVE SIGNALS ===
  // KEY: Use very low deadzones and aggressive power curves for negatives,
  // because natural sad/stressed expressions produce tiny blendshape values.

  // Frown (mouth corners down): the primary sadness signal
  // Natural sadness frown is as low as 0.02-0.05
  const frownStrength = softCurve(features.frown, 0.01, 0.18, 0.4);

  // Brow furrow (brows pulled down/together): anger, frustration, deep sadness
  const furrowStrength = softCurve(features.browFurrow, 0.01, 0.25, 0.45);

  // Sad brows (inner brows raised without outer): distress, worry, about to cry
  const sadBrowStrength = softCurve(features.sadBrows, 0.01, 0.20, 0.4);

  // Squint WITHOUT smile = tension/displeasure
  const tensionSquint = (features.smile < 0.04 && features.squint > 0.03)
    ? softCurve(features.squint, 0.03, 0.45, 0.6) * 0.15
    : 0;

  // Lip press (anxiety / suppressed emotion / holding back tears)
  const lipPressStrength = (features.smile < 0.04)
    ? softCurve(features.lipPress, 0.02, 0.35, 0.5) * 0.12
    : 0;

  // Nose wrinkle (disgust / displeasure)
  const noseWrinkleStrength = softCurve(features.noseWrinkle, 0.02, 0.30, 0.5) * 0.1;

  // Mouth pucker without smile = discomfort / unease
  const puckerStrength = (features.smile < 0.04)
    ? softCurve(features.mouthPucker, 0.03, 0.35, 0.6) * 0.08
    : 0;

  // Eye droop (heavy eyelids, not blinking) = sadness / tiredness
  const eyeDroopStrength = (features.smile < 0.04 && features.eyeDroop > 0)
    ? softCurve(features.eyeDroop, 0.08, 0.45, 0.6) * 0.1
    : 0;

  // Mouth lower down (lip pulled down) = sadness / about to cry
  const mouthLowerStrength = softCurve(features.mouthLowerDown, 0.02, 0.3, 0.5) * 0.08;

  // Combine negatives with weighted sum
  // Frown gets the most weight as the primary sadness indicator
  const totalNegative = Math.min(
    frownStrength * 0.40
    + furrowStrength * 0.20
    + sadBrowStrength * 0.20
    + tensionSquint
    + lipPressStrength
    + noseWrinkleStrength
    + puckerStrength
    + eyeDroopStrength
    + mouthLowerStrength,
    1.0
  );

  // === COMBINE INTO SCORE ===
  // Start at 50 (neutral), positive pushes up to 100, negative pushes down to 0
  // The two signals compete: if you smile while frowning, they partially cancel
  const netSignal = totalPositive - totalNegative;

  // Map to 0-100: netSignal of 0 = 50, +1 = 100, -1 = 0
  const score = 50 + netSignal * 50;

  return Math.max(0, Math.min(100, score));
}

export function applyTemporalSmoothingStep(currentScore: number): number {
  if (previousFinalScore === null) {
    previousFinalScore = currentScore;
    return Math.round(currentScore);
  }

  // Adaptive smoothing: respond faster to big changes, slower to small ones
  const diff = Math.abs(currentScore - previousFinalScore);
  // Small changes (noise): alpha ~0.25 (heavy smoothing)
  // Big changes (real emotion shift): alpha ~0.65 (responsive)
  const alpha = 0.25 + 0.40 * Math.min(diff / 25, 1);

  const finalScore = previousFinalScore * (1 - alpha) + currentScore * alpha;
  const clamped = Math.max(0, Math.min(100, Math.round(finalScore)));
  previousFinalScore = clamped;
  return clamped;
}

export function resetScoringState(): void {
  previousFinalScore = null;
}
