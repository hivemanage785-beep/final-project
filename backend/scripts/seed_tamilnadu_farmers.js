import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Farmer } from '../src/models/Farmer.js';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/hiveops";

// Tamil Nadu Bounding Box roughly: Lat 8.08 to 13.5, Lng 76.1 to 80.2
const TAMIL_NADU_BOUNDS = {
  latMin: 8.1,
  latMax: 13.4,
  lngMin: 76.2,
  lngMax: 80.1
};

function getRandomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

const CROP_TYPES = [
  ['Mango', 'Coconut'],
  ['Banana', 'Papaya'],
  ['Citrus', 'Cotton'],
  ['Sunflower', 'Mustard'],
  ['Neem', 'Tamarind'],
  ['Moringa', 'Guava']
];

async function seedFarmers() {
  try {
    console.log("Connecting to MongoDB:", MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log("Connected. Seeding 250 farmers across Tamil Nadu...");

    // wipe old demo farmers just to be clean
    await Farmer.deleteMany({ "name": { $regex: "Farmer" } });

    const farmers = [];
    for (let i = 1; i <= 250; i++) {
        const lat = getRandomInRange(TAMIL_NADU_BOUNDS.latMin, TAMIL_NADU_BOUNDS.latMax);
        const lng = getRandomInRange(TAMIL_NADU_BOUNDS.lngMin, TAMIL_NADU_BOUNDS.lngMax);

        farmers.push({
            farmer_id: `FARM-TN-${i}-${Date.now()}`,
            name: `Tamil Nadu Farmer ${i}`,
            phone: `+91 ${Math.floor(6000000000 + Math.random() * 3999999999)}`,
            location: {
                type: 'Point',
                coordinates: [lng, lat]
            },
            crop_type: CROP_TYPES[i % CROP_TYPES.length],
            is_public: true,
            status: 'approved' // Automatically approved to show up on map
        });
    }

    await Farmer.insertMany(farmers);
    console.log(`Successfully inserted ${farmers.length} farmers into MongoDB!`);
    
  } catch (error) {
    console.error("Seeding failed:", error);
  } finally {
    process.exit(0);
  }
}

seedFarmers();
