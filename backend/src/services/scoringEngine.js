export function computeWeatherScore(avgTemp, avgRain, avgWind) {
  let temp_score = 0;
  if (avgTemp >= 20 && avgTemp <= 32) temp_score = 100;
  else if (avgTemp >= 15 && avgTemp < 20) temp_score = 50 + ((avgTemp - 15) / 5) * 50;
  else if (avgTemp > 32 && avgTemp <= 38) temp_score = 100 - ((avgTemp - 32) / 6) * 50;
  else if (avgTemp < 15) temp_score = Math.max(0, 50 - ((15 - avgTemp) / 15) * 50);
  else temp_score = Math.max(0, 50 - ((avgTemp - 38) / 10) * 50);

  let rain_score = 0;
  if (avgRain >= 2 && avgRain <= 5) rain_score = 100;
  else if (avgRain >= 0 && avgRain < 2) rain_score = 40 + (avgRain / 2) * 60;
  else if (avgRain > 5 && avgRain <= 10) rain_score = 100 - ((avgRain - 5) / 5) * 40;
  else rain_score = Math.max(0, 60 - ((avgRain - 10) / 10) * 60);

  let wind_score = 0;
  if (avgWind >= 0 && avgWind <= 15) wind_score = 100;
  else if (avgWind > 15 && avgWind <= 25) wind_score = 100 - ((avgWind - 15) / 10) * 40;
  else wind_score = Math.max(0, 60 - ((avgWind - 25) / 15) * 60);

  return 0.5 * temp_score + 0.3 * rain_score + 0.2 * wind_score;
}

export function computeFloraScore(floraCount) {
  if (floraCount === 0) return 30;
  return Math.min(floraCount / 2000, 1.0) * 100;
}

const SEASON_TABLE = { 1:60, 2:65, 3:80, 4:85, 5:90, 6:55, 7:50, 8:55, 9:65, 10:70, 11:75, 12:65 };

export function computeSeasonScore(month) {
  return SEASON_TABLE[month] || 60;
}

export function computeFinalScore(weatherScore, floraScore, seasonScore, weights = { weather: 0.35, flora: 0.40, season: 0.25 }) {
  return Math.round(weights.weather * weatherScore + weights.flora * floraScore + weights.season * seasonScore);
}

export function deriveOutputs(score, weatherScore, floraScore, seasonScore, month, rawWeather, floraCount, mlWeightsUsed) {
  let grade = 'Excellent';
  if (score < 40) grade = 'Poor';
  else if (score < 60) grade = 'Fair';
  else if (score < 80) grade = 'Good';

  let recommendedHives = 8;
  if (score < 40) recommendedHives = 0;
  else if (score < 60) recommendedHives = 2;
  else if (score < 75) recommendedHives = 4;
  else if (score < 90) recommendedHives = 6;

  let yieldOutlook = 'High';
  if (score < 40) yieldOutlook = 'Poor';
  else if (score < 65) yieldOutlook = 'Moderate';
  else if (score < 80) yieldOutlook = 'Good';

  const minScore = Math.min(weatherScore, floraScore, seasonScore);
  let primaryConcern = '';
  if (minScore === weatherScore) {
    primaryConcern = "Temperature or rainfall conditions are suboptimal for bee foraging this week.";
  } else if (minScore === floraScore) {
    primaryConcern = "Flora density within 8km is low — limited nectar sources may reduce yield.";
  } else {
    primaryConcern = "This month is outside the peak flowering season for Tamil Nadu.";
  }

  let movementAdvice = "Current timing is good. This is an active flowering period.";
  if (seasonScore < 65) {
    const bestMonth = 5; // May
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    movementAdvice = `Consider placing hives here in ${monthNames[bestMonth-1]} for peak season conditions.`;
  }

  const reasoning = [];
  reasoning.push(`Average temperature of ${Math.round(rawWeather.avgTemp)}°C ${rawWeather.avgTemp >= 20 && rawWeather.avgTemp <= 32 ? 'is in the optimal foraging range.' : 'forces bees to expend extra energy.'}`);
  reasoning.push(`Rainfall around ${Math.round(rawWeather.avgRain)} mm/day ${rawWeather.avgRain <= 5 ? 'allows consistent foraging flights.' : 'is high and may limit nectar gathering.'}`);
  reasoning.push(floraCount > 500 ? `Strong flora presence (${floraCount} observations) indicates abundant resources within range.` : `Lower flora density (${floraCount} observations) suggests finding a more resource-rich patch.`);
  reasoning.push(seasonScore >= 65 ? "The selected month provides suitable natural forage blooming." : "Seasonal timing presents fewer naturally blooming nectar flows.");

  return {
    score: Math.round(score),
    grade,
    weatherScore: Math.round(weatherScore),
    floraScore: Math.round(floraScore),
    seasonScore: Math.round(seasonScore),
    recommendedHives,
    yieldOutlook,
    primaryConcern,
    movementAdvice,
    reasoning,
    rawWeather,
    floraCount,
    mlWeightsUsed
  };
}
