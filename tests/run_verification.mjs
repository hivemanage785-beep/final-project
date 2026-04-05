import { spawn } from 'child_process';

async function runTest() {
  console.log('--- STARTING ENVIROMENTS ---');

  const ml = spawn('python', ['-m', 'uvicorn', 'main:app', '--port', '8000'], { cwd: './ml/app' });
  const backend = spawn('node', ['src/index.js'], { cwd: './backend', env: { ...process.env, PORT: 3001, ML_SERVICE_URL: 'http://localhost:8000' } });

  ml.stdout.on('data', d => console.log(`[ML LOG] ${d.toString().trim()}`));
  ml.stderr.on('data', d => console.log(`[ML ERR] ${d.toString().trim()}`));
  
  backend.stdout.on('data', d => console.log(`[BACKEND LOG] ${d.toString().trim()}`));
  backend.stderr.on('data', d => console.log(`[BACKEND ERR] ${d.toString().trim()}`));

  // Wait 3s for startup
  await new Promise(r => setTimeout(r, 6000));

  console.log('--- RUNNING FULL FLOW TEST ---');
  
  try {
    console.log('[FRONTEND] -> Sending POST /api/score');
    const scoreRes = await fetch('http://localhost:3001/api/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: 10, lng: 77, month: 4 })
    });
    
    const scoreData = await scoreRes.json();
    console.log('[FRONTEND] <- Received POST /api/score', JSON.stringify(scoreData, null, 2));
    
    console.log('[FRONTEND] -> Sending POST /api/feedback');
    const fbRes = await fetch('http://localhost:3001/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: 10, lng: 77, month: 4,
        weatherScore: 50, floraScore: 50, seasonScore: 50,
        finalScore: 50, floraCount: 100, avgTemp: 30, avgRain: 10, avgWind: 5
      })
    });
    
    const fbData = await fbRes.json();
    console.log('[FRONTEND] <- Received POST /api/feedback', JSON.stringify(fbData, null, 2));
    
  } catch(e) {
    console.error('Test Failed:', e);
  } finally {
    ml.kill();
    backend.kill();
    console.log('--- TEST FINISHED ---');
  }
}

runTest();
