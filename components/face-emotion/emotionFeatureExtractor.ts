/**
 * emotionFeatureExtractor.ts
 * Uses MediaPipe's pre-trained 52 Face Blendshapes for robust, scale-invariant expression detection.
 * 
 * Extracts high-level emotional features from raw blendshapes:
 * - smile: lip corners pulled up (happiness)
 * - frown: lip corners pulled down (sadness)  
 * - browRaise: eyebrows up (surprise/excitement)
 * - sadBrows: inner brows up without outer brows (distress/concern)
 * - browFurrow: brows pulled down/together (anger/frustration)
 * - jawOpen: mouth open (surprise/excitement/laughter)
 * - squint: eyes narrowed (genuine smile OR tension)
 * - lipPress: lips pressed together (suppressed emotion/anxiety)
 * - noseWrinkle: nose wrinkled (disgust/displeasure)
 * - mouthPucker: lips puckered (discomfort/unease)
 * - eyeDroop: upper eyelids drooping (sadness/tiredness)
 * - mouthLowerDown: lower lip pulled down (sadness/distress)
 */

import { NormalizedLandmark } from "./mediapipeService";

export interface EmotionFeatures {
  smile: number;        // Happiness
  frown: number;        // Sadness
  browRaise: number;    // Surprise / Excitement
  sadBrows: number;     // Distress / Sadness (Inner brows up)
  browFurrow: number;   // Anger / Confusion / Sadness
  jawOpen: number;      // Excitement / Surprise
  squint: number;       // Genuine smile or tension
  lipPress: number;     // Suppressed emotion / anxiety
  noseWrinkle: number;  // Disgust / displeasure
  mouthPucker: number;  // Discomfort / unease
  eyeDroop: number;     // Sadness / tiredness (NOT blinking)
  mouthLowerDown: number; // Sadness / distress
}

// Extract features directly from robust pre-trained blendshapes
export function extractFeatures(
  landmarks: NormalizedLandmark[],
  blendshapes?: { categoryName: string; score: number }[]
): EmotionFeatures {
  if (!blendshapes || blendshapes.length === 0) {
    return {
      smile: 0, frown: 0, browRaise: 0, sadBrows: 0, browFurrow: 0,
      jawOpen: 0, squint: 0, lipPress: 0, noseWrinkle: 0,
      mouthPucker: 0, eyeDroop: 0, mouthLowerDown: 0,
    };
  }

  // Helper to get blendshape score safely
  const getScore = (name: string) => {
    const shape = blendshapes.find(b => b.categoryName === name);
    return shape ? shape.score : 0;
  };

  // Happiness: Pulling lip corners up
  const smile = (getScore("mouthSmileLeft") + getScore("mouthSmileRight")) / 2;

  // Sadness: Pulling lip corners down
  const frown = (getScore("mouthFrownLeft") + getScore("mouthFrownRight")) / 2;

  // Surprise/Excitement: Inner & Outer brows up
  const browInnerUp = getScore("browInnerUp");
  const browOuterUp = (getScore("browOuterUpLeft") + getScore("browOuterUpRight")) / 2;
  const browRaise = (browInnerUp + browOuterUp) / 2;

  // Distress/Sadness: Inner brows up WITHOUT outer brows (Puppy dog eyes)
  const sadBrows = Math.max(0, browInnerUp - browOuterUp * 0.8);

  // Anger/Sadness: Brows down
  const browFurrow = (getScore("browDownLeft") + getScore("browDownRight")) / 2;

  // Jaw Drop
  const jawOpen = getScore("jawOpen");

  // Squint (can mean genuine smile or tension)
  const squint = (getScore("eyeSquintLeft") + getScore("eyeSquintRight")) / 2;

  // Lip press: lips pressed together (anxiety / suppressed emotion)
  const lipPress = (getScore("mouthPressLeft") + getScore("mouthPressRight")) / 2;

  // Nose wrinkle (disgust)
  const noseWrinkle = (getScore("noseSneerLeft") + getScore("noseSneerRight")) / 2;

  // Mouth pucker (discomfort, unease)
  const mouthPucker = getScore("mouthPucker");

  // Eye droop: eyelids heavy/drooping (sadness, tiredness)
  // Use eyeBlink but only when it's partial (not a full blink)
  const blinkL = getScore("eyeBlinkLeft");
  const blinkR = getScore("eyeBlinkRight");
  const avgBlink = (blinkL + blinkR) / 2;
  // Partial lid closure (0.1-0.5) = droopy, full blink (>0.7) = just blinking
  const eyeDroop = (avgBlink > 0.08 && avgBlink < 0.6) ? avgBlink : 0;

  // Mouth lower down (lip pulled down, associated with sadness / about to cry)
  const mouthLowerDown = (getScore("mouthLowerDownLeft") + getScore("mouthLowerDownRight")) / 2;

  return {
    smile,
    frown,
    browRaise,
    sadBrows,
    browFurrow,
    jawOpen,
    squint,
    lipPress,
    noseWrinkle,
    mouthPucker,
    eyeDroop,
    mouthLowerDown,
  };
}
