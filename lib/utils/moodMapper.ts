/**
 * moodMapper.ts
 * Maps integer scores to emotion labels.
 */

/**
 * Score Range	Emotion Label
 * 0–15	😔 Down
 * 16–35	😟 Stressed
 * 36–48	😕 Uneasy
 * 49–55	😐 Neutral
 * 56–70	😌 Calm
 * 71–85	😊 Happy
 * 86–100	✨ Excited
 */
export function getMoodCategory(score: number): string {
  if (score <= 15) return "😔 Down";
  if (score <= 35) return "😟 Stressed";
  if (score <= 48) return "😕 Uneasy";
  if (score <= 55) return "😐 Neutral";
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
