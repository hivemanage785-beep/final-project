export function getDecision(score: number): string {
  if (score >= 70) return "Good for hive placement";
  if (score >= 40) return "Moderate – monitor conditions";
  return "Avoid – low flowering potential";
}

export function getExplanation(temperature: number, humidity: number, rainfall: number): string {
  const factors: string[] = [];
  
  if (humidity > 80) factors.push("high humidity");
  if (rainfall > 10) factors.push("heavy rainfall");
  if (temperature > 35) factors.push("high temperature stress");
  
  if (factors.length > 0) {
    return "Main factors: " + factors.join(", ");
  }
  return "Main factors: Normal weather conditions";
}
