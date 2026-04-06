import mongoose from 'mongoose';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { Hive } from '../src/models/Hive.js';
import { Inspection } from '../src/models/Inspection.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/buzzoff';

const HISTORICAL_NOTES = [
  "Hive expanding well, added second deep.",
  "Checked for mites, count is low.",
  "Queen spotted, laying solid brood pattern.",
  "Fed 1:1 sugar syrup to stimulate draw out.",
  "Pollen pants aplenty - good foraging today.",
  "Removed entrance reducer for summer flow."
];

async function seedHistory() {
  try {
    console.log(`Connecting to MongoDB: ${MONGO_URI}`);
    await mongoose.connect(MONGO_URI);
    
    // Wipe old inspections to start clean
    await Inspection.deleteMany({});
    
    const demoHives = await Hive.find({});
    console.log(`Found ${demoHives.length} demo hives to populate with 4 months of history...`);
    
    let totalInspections = 0;
    let totalRelocations = 0;
    
    for (let hive of demoHives) {
      const now = Date.now();
      const fourMonthsMs = 4 * 30 * 24 * 60 * 60 * 1000;
      
      // Generate 5-8 random inspections over the last 4 months
      const numInspections = Math.floor(Math.random() * 4) + 5;
      
      let baseLat = hive.lat;
      let baseLng = hive.lng;
      
      const inspections = [];
      const location_history = [];
      
      let lastDateMs = now - fourMonthsMs;
      
      // Simulate initial placement
      location_history.push({
        lat: baseLat + (Math.random() * 0.05 - 0.025),
        lng: baseLng + (Math.random() * 0.05 - 0.025),
        date: new Date(lastDateMs),
        reason: "Initial hive placement for early season"
      });
      
      for (let i = 0; i < numInspections; i++) {
        const stepMs = fourMonthsMs / numInspections;
        const inspectDateMs = lastDateMs + stepMs + (Math.random() * 86400000 * 2 - 86400000); // jitter
        const inspectDate = new Date(inspectDateMs);
        lastDateMs = inspectDateMs;
        
        inspections.push({
          _id: crypto.randomUUID(),
          uid: hive.uid,
          hive_id: hive._id.toString(), // Needs to link to hive's _id or hive_id? Inspection uses hive_id usually referencing Hive.id
          date: inspectDate,
          notes: HISTORICAL_NOTES[Math.floor(Math.random() * HISTORICAL_NOTES.length)],
          box_count: Math.floor(i / 2) + 1, // boxes increase over time
          queen_status: 'healthy',
          health_status: 'good',
          syncVersion: 1
        });
        
        // Randomly relocate the hive occasionally (1 in 4 chance)
        if (Math.random() > 0.75) {
          totalRelocations++;
          const newLat = baseLat + (Math.random() * 0.2 - 0.1);
          const newLng = baseLng + (Math.random() * 0.2 - 0.1);
          
          location_history.push({
            lat: newLat,
            lng: newLng,
            date: inspectDate,
            reason: "Relocated to chase blooming flora"
          });
          
          // Update base to new location
          baseLat = newLat;
          baseLng = newLng;
        }
      }
      
      // Save inspections
      await Inspection.insertMany(inspections);
      totalInspections += inspections.length;
      
      // Finalise hive current state
      hive.lat = baseLat;
      hive.lng = baseLng;
      hive.location_history = location_history;
      hive.last_inspection_date = new Date(lastDateMs);
      await hive.save();
    }
    
    console.log(`✅ Seeded ${totalInspections} historical inspection logs over 4 months.`);
    console.log(`✅ Simulated ${totalRelocations} dynamic hive relocations.`);
    
  } catch (error) {
    console.error("Seeding error:", error);
  } finally {
    mongoose.disconnect();
    process.exit();
  }
}

seedHistory();
