import axios from 'axios';

const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://localhost:3001';
const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

async function runTests() {
  console.log('--- Buzz-Off E2E Performance & API Test ---');

  // 1. Backend Health
  try {
    const health = await axios.get(`${BACKEND_URL}/health`);
    console.log('✅ Backend Health:', health.data.status === 'ok' ? 'PASS' : 'FAIL');
  } catch (e) {
    console.log('❌ Backend Health: FAILED', e.message);
  }

  // 2. Heatmap API
  try {
    const heatmap = await axios.get(`${BACKEND_URL}/api/heatmap?month=5`);
    const count = heatmap.data.points.length;
    console.log(`✅ Heatmap API: PASS (${count} points)`);
  } catch (e) {
    console.log('❌ Heatmap API: FAILED', e.message);
  }

  // 3. Scoring API
  try {
    const scoreBody = { lat: 11.1271, lng: 78.6569, month: 5 };
    const score = await axios.post(`${BACKEND_URL}/api/score`, scoreBody);
    console.log('✅ Scoring API: PASS');
    console.log('   - Result Grade:', score.data.grade);
    console.log('   - Recommended Hives:', score.data.recommendedHives);
  } catch (e) {
    console.log('❌ Scoring API: FAILED', e.message);
  }

  // 4. ML Weights API
  try {
    const weights = await axios.get(`${ML_URL}/predict-weights`);
    console.log('✅ ML Weights API: PASS');
    console.log('   - Weights:', weights.data);
  } catch (e) {
    console.log('❌ ML Weights API: FAILED', e.message);
  }

  console.log('--- Tests Complete ---');
}

runTests();
