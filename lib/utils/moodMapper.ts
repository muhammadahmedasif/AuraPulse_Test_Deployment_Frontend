/**
 * moodMapper.ts
 * Maps integer scores to emotion labels.
 * 
 * The Neutral zone (44-56) is intentionally wide to accommodate
 * the natural micro-fluctuations of a resting face.
 */

/**
 * Score Range  Emotion Label
 * 0–14         😔 Down
 * 15–30        😟 Stressed
 * 31–43        😕 Uneasy
 * 44–56        😐 Neutral
 * 57–70        😌 Calm
 * 71–85        😊 Happy
 * 86–100       ✨ Excited
 */
export function getMoodCategory(score: number): string {
  if (score <= 14) return "😔 Down";
  if (score <= 30) return "😟 Stressed";
  if (score <= 43) return "😕 Uneasy";
  if (score <= 56) return "😐 Neutral";
  if (score <= 70) return "😌 Calm";
  if (score <= 85) return "😊 Happy";
  return "✨ Excited";
}

/**
 * Backward-compat: returns simple category for DB/chat system
 */
export function getSimpleMoodCategory(score: number): string {
  if (score <= 40) return "negative";
  if (score <= 60) return "neutral";
  return "positive";
}
