export function mapExpressionsToMoodScore(expressions: { happy?: number; neutral?: number; sad?: number; angry?: number; surprised?: number; [key: string]: any }): number {
  if (!expressions) return 0.5;

  const happy = expressions.happy || 0;
  const neutral = expressions.neutral || 0;
  const sad = expressions.sad || 0;
  const angry = expressions.angry || 0;
  const surprised = expressions.surprised || 0;
  
  const rawScore = 
    (happy * 1.0) +
    (surprised * 0.6) +
    (neutral * 0.5) +
    (angry * 0.1) +
    (sad * 0.0);
    
  const totalWeight = happy + surprised + neutral + angry + sad;
  
  if (totalWeight === 0) return 0.5;
  
  const normalizedScore = rawScore / totalWeight;
  return Math.min(Math.max(normalizedScore, 0), 1);
}

export function getMoodCategory(score: number): string {
  if (score >= 0.7) return "positive";
  if (score <= 0.4) return "negative";
  return "neutral";
}
