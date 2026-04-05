import axios from 'axios';

async function verifyAPI() {
  const BASE_URL = 'http://localhost:3001';
  console.log('Validating Production Endpoints...');

  try {
    // 1. Health check
    const healthResult = await axios.get(`${BASE_URL}/api/health`);
    console.log('[OK] /api/health ->', healthResult.data);

    // 2. Heatmap Grid (Public)
    const heatmapGrid = await axios.get(`${BASE_URL}/api/heatmap-grid?month=4&lat_min=10&lat_max=14&lng_min=78&lng_max=82`);
    console.log('[OK] /api/heatmap-grid -> Count:', heatmapGrid.data.count);

    // 3. Status
    const statusResult = await axios.get(`${BASE_URL}/api/tiles/status`);
    console.log('[OK] /api/tiles/status ->', statusResult.data);
    
    // Auth-protected endpoints need tokens, testing public APIs first.
    console.log('\n--- Public Endpoint Validation Complete ---');

  } catch (error) {
    console.error(`[FAILED]`, error.message);
    if (error.response) console.error(error.response.data);
  }
}

verifyAPI();
