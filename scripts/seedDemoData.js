const axios = require('axios');

const BASE_URL = 'http://localhost:3000'; // Make sure backend is on 3000 if not proxying, or 3001
// Based on typical dev setup, the backend runs on 3001 but let's check
const TOKEN = 'PASTE_YOUR_AUTH_TOKEN_HERE';

// We need a helper to generate dates, random outcomes, and a delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${TOKEN}`
  },
  timeout: 10000
});

async function runSeed() {
  console.log('Starting seed...');

  // 1. Create Hives
  const crypto = require('crypto');
  const hive1 = {
    _id: crypto.randomUUID(),
    uid: 'system_will_overwrite_from_token',
    hive_id: 'HIVE-KAVERI',
    lat: 11.1271,
    lng: 78.6569,
    box_count: 2,
    health_status: 'good',
    notes: 'Near flowering zone'
  };

  const hive2 = {
    _id: crypto.randomUUID(),
    uid: 'system_will_overwrite_from_token',
    hive_id: 'HIVE-SALEM-2',
    lat: 11.6643,
    lng: 78.1460,
    box_count: 3,
    health_status: 'fair',
    notes: 'Moderate conditions'
  };

  const hive3 = {
    _id: crypto.randomUUID(),
    uid: 'system_will_overwrite_from_token',
    hive_id: 'HIVE-OOTY-1',
    lat: 11.4102,
    lng: 76.6950,
    box_count: 1,
    health_status: 'poor',
    queen_status: 'missing',
    notes: 'High altitude, cold stress'
  };

  let createdHives = [];
  for (const h of [hive1, hive2, hive3]) {
    try {
      console.log(`Creating hive ${h.hive_id}...`);
      const res = await api.post('/api/hives', h);
      console.log('Created hive:', res.data);
      createdHives.push(h.hive_id);
    } catch (err) {
      console.error(`Failed to create hive ${h.hive_id}:`, err.response?.data || err.message);
    }
  }

  // 2. Create Inspections (Activities)
  const inspections = [
    { _id: crypto.randomUUID(), hive_id: 'HIVE-KAVERI', date: new Date().toISOString(), notes: 'Inspection completed. Honey frames 80% full.', health_status: 'good', box_count: 2 },
    { _id: crypto.randomUUID(), hive_id: 'HIVE-SALEM-2', date: new Date().toISOString(), notes: 'Check overdue by 3 days', health_status: 'fair', box_count: 3 },
    { _id: crypto.randomUUID(), hive_id: 'HIVE-OOTY-1', date: new Date().toISOString(), notes: 'Queen missing, colony weak.', health_status: 'poor', queen_status: 'missing', box_count: 1 },
    { _id: crypto.randomUUID(), hive_id: 'HIVE-KAVERI', date: new Date(Date.now() - 7 * 86400000).toISOString(), notes: 'Routine check. Looked strong.', health_status: 'good', box_count: 2 },
    { _id: crypto.randomUUID(), hive_id: 'HIVE-SALEM-2', date: new Date(Date.now() - 15 * 86400000).toISOString(), notes: 'Added a super box.', health_status: 'good', box_count: 3 }
  ];

  for (const ins of inspections) {
    try {
      console.log(`Creating inspection for ${ins.hive_id}...`);
      // Add fake UID (will be overridden by auth middleware)
      ins.uid = 'system_will_overwrite_from_token';
      const res = await api.post('/api/inspections', ins);
      console.log('Created inspection:', res.data);
    } catch (err) {
      console.error(`Failed to create inspection for ${ins.hive_id}:`, err.response?.data || err.message);
    }
  }

  // 3. Alerts
  // In this system, alerts are derived dynamically via GET /api/alerts based on hive status!
  // No POST /api/alerts exists based on alerts.js. 
  // By creating a 'poor' and 'missing' queen hive (Ooty-1) and an overdue inspection, alerts will automatically generate!
  console.log('Alerts will auto-generate based on hive status (see Ooty-1).');

  // 4. Feedback Data (150 entries)
  console.log('Starting to seed 150 feedback entries...');
  for (let i = 1; i <= 150; i++) {
    // Generate random within TN bounds
    const lat = 8.0 + Math.random() * (13.5 - 8.0);
    const lng = 76.0 + Math.random() * (80.5 - 76.0);
    const temperature = 20 + Math.random() * (38 - 20);
    const humidity = 40 + Math.random() * (95 - 40);
    const rainfall = Math.random() * 20;
    const predicted_score = 20 + Math.random() * 70;

    let actual_outcome = 'average';
    if (humidity > 85) actual_outcome = 'poor';
    else if (rainfall >= 2 && rainfall <= 8) actual_outcome = 'good';
    else if (temperature > 35) actual_outcome = 'poor';
    else {
      const rand = Math.random();
      if (rand > 0.8) actual_outcome = 'good';
      else if (rand < 0.2) actual_outcome = 'poor';
    }

    const payload = {
      lat,
      lng,
      temperature,
      humidity,
      rainfall,
      predicted_score,
      actual_outcome
    };

    try {
      await api.post('/api/feedback', payload);
      if (i % 10 === 0) {
        console.log(`Inserted feedback ${i}/150`);
      }
      await delay(50); // Be nice to the server
    } catch (err) {
      console.error(`Error on feedback ${i}:`, err.response?.data || err.message);
    }
  }

  console.log('Done seeding data.');
}

runSeed();
