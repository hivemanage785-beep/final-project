import axios from 'axios';
import crypto from 'crypto';

async function testEndpoints() {
  const BASE_URL = 'http://127.0.0.1:3001';
  let allPassed = true;
  // Tamil Nadu coordinates to pass the geofence guard
  const TN_LAT = 10.833;
  const TN_LNG = 78.656;

  console.log('--- Testing Endpoints ---');

  // 1. Health
  try {
    const res = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ GET /api/health:', res.status);
  } catch (e) {
    console.error('❌ GET /api/health FAILED:', e.message);
    allPassed = false;
  }

  // 2. Auth Register (Mock payload matching Firebase UID requirement)
  try {
    const res = await axios.post(`${BASE_URL}/api/auth/register`, {
      email: "testuser@example.com",
      firebaseUid: "test-firebase-uid-123",
      displayName: "Test User"
    });
    console.log('✅ POST /api/auth/register:', res.status);
  } catch (e) {
    console.error('❌ POST /api/auth/register FAILED:', e.message, e.response?.data);
    allPassed = false;
  }

  // 3. Score (Using Tamil Nadu coordinates)
  let scoreData = null;
  try {
    const res = await axios.post(`${BASE_URL}/api/score`, {
      lat: TN_LAT,
      lng: TN_LNG,
      month: 5
    });
    console.log(`✅ POST /api/score: ${res.status}, Score: ${res.data.data?.score}`);
    scoreData = res.data.data;
  } catch (e) {
    console.error('❌ POST /api/score FAILED:', e.message, e.response?.data);
    allPassed = false;
  }

  // 4. Feedback (Matching strict Zod schema)
  if (scoreData) {
    try {
      const res = await axios.post(`${BASE_URL}/api/feedback`, {
        lat: TN_LAT,
        lng: TN_LNG,
        month: 5,
        weatherScore: scoreData.weatherScore || 80,
        floraScore: scoreData.floraScore || 80,
        seasonScore: scoreData.seasonScore || 80,
        finalScore: scoreData.score || 80,
        floraCount: scoreData.floraCount || 50,
        avgTemp: scoreData.rawWeather?.avgTemp || 28,
        avgRain: scoreData.rawWeather?.avgRain || 2,
        avgWind: scoreData.rawWeather?.avgWind || 10,
        uid: 'test-user-123'
      });
      console.log(`✅ POST /api/feedback: ${res.status}`);
    } catch (e) {
      console.error('❌ POST /api/feedback FAILED:', e.message, e.response?.data);
      allPassed = false;
    }
  }

  // 5. Allocate Hives
  try {
    const res = await axios.post(`${BASE_URL}/api/allocate-hives`, {
      locations: [{ lat: TN_LAT, lng: TN_LNG, score: 85 }],
      hiveCount: 5
    });
    console.log(`✅ POST /api/allocate-hives: ${res.status}`);
  } catch (e) {
    console.error('❌ POST /api/allocate-hives FAILED:', e.message, e.response?.data);
    allPassed = false;
  }

  // 6. Simulate
  try {
    const res = await axios.post(`${BASE_URL}/api/simulate`, {
      locations: [{ lat: TN_LAT, lng: TN_LNG, score: 80 }],
      hiveCount: 5
    });
    console.log(`✅ POST /api/simulate: ${res.status}`);
  } catch (e) {
    console.error('❌ POST /api/simulate FAILED:', e.message, e.response?.data);
    allPassed = false;
  }

  if (allPassed) {
    console.log('\n--- All Public/Mockable Endpoints Passed! ---');
  } else {
    console.log('\n--- Some Endpoints Failed! Review logs above. ---');
  }
}

testEndpoints();
