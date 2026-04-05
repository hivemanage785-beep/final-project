import axios from 'axios';

async function testEndpoints() {
  const BASE_URL = 'http://localhost:3001';
  let allPassed = true;

  console.log('--- Testing Endpoints ---');

  // 1. Health
  try {
    const res = await axios.get(`${BASE_URL}/health`);
    console.log('✅ GET /health:', res.status, res.data);
  } catch (e) {
    console.error('❌ GET /health FAILED:', e.message);
    allPassed = false;
  }

  // 2. Heatmap
  try {
    const res = await axios.get(`${BASE_URL}/api/heatmap?month=4`);
    console.log(`✅ GET /api/heatmap: ${res.status}, Points returned: ${res.data.data?.points?.length}`);
  } catch (e) {
    console.error('❌ GET /api/heatmap FAILED:', e.message);
    allPassed = false;
  }

  // 3. Score
  let scoreData = null;
  try {
    const res = await axios.post(`${BASE_URL}/api/score`, {
      lat: 10.833,
      lng: 78.656,
      month: 4
    });
    console.log(`✅ POST /api/score: ${res.status}, Score: ${res.data.data?.score}, Grade: ${res.data.data?.grade}`);
    scoreData = res.data.data;
  } catch (e) {
    console.error('❌ POST /api/score FAILED:', e.message, e.response?.data);
    allPassed = false;
  }

  // 4. Feedback
  if (scoreData) {
    try {
      const res = await axios.post(`${BASE_URL}/api/feedback`, {
        lat: 10.833,
        lng: 78.656,
        month: 4,
        weatherScore: scoreData.weatherScore || 0,
        floraScore: scoreData.floraScore || 0,
        seasonScore: scoreData.seasonScore || 0,
        finalScore: scoreData.score || 0,
        floraCount: scoreData.floraCount || 0,
        avgTemp: scoreData.rawWeather?.avgTemp || 28,
        avgRain: scoreData.rawWeather?.avgRain || 0,
        avgWind: scoreData.rawWeather?.avgWind || 5,
        uid: 'test-user-123'
      });
      console.log(`✅ POST /api/feedback: ${res.status}, Response:`, res.data);
    } catch (e) {
      console.error('❌ POST /api/feedback FAILED:', e.message, e.response?.data);
      allPassed = false;
    }
  } else {
    console.log('⚠️ Skipping POST /api/feedback due to /api/score failure.');
  }

  if (allPassed) {
    console.log('--- All Endpoints Passed! ---');
  } else {
    console.log('--- Some Endpoints Failed! ---');
  }
}

testEndpoints();
