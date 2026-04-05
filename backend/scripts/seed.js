import mongoose from 'mongoose';
import { faker } from '@faker-js/faker';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { Farmer } from '../src/models/Farmer.js';
import { GeoTile } from '../src/models/GeoTile.js';
import { toTileKey } from '../src/lib/tileUtils.js';
import { Hive } from '../src/models/Hive.js';
import { User } from '../src/models/User.js';

import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/buzzoff';
const CROP_TYPES = ['Paddy', 'Sugarcane', 'Cotton', 'Turmeric', 'Banana', 'Mango', 'Coconut'];

// Clustered Agriculture Nodes (Tamil Nadu)
const CLUSTERS = [
  { lat: 13.0827, lng: 80.2707, spread: 0.4 }, // Chennai Region
  { lat: 9.9252,  lng: 78.1198, spread: 0.3 }, // Madurai Region
  { lat: 11.0168, lng: 76.9558, spread: 0.3 }, // Coimbatore Region
  { lat: 10.7905, lng: 78.7047, spread: 0.2 }  // Trichy Region
];

function generateClusteredCoord(cluster) {
    const u = 1 - Math.random();
    const v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    const lat = cluster.lat + (z * cluster.spread * 0.5);
    const z2 = Math.sqrt(-2.0 * Math.log(u)) * Math.sin(2.0 * Math.PI * v);
    const lng = cluster.lng + (z2 * cluster.spread * 0.5);
    return { lat, lng };
}

const runSeeder = async () => {
  try {
    console.log(`Connecting to MongoDB: ${MONGO_URI}`);
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB.");

    await Farmer.deleteMany({});
    await GeoTile.deleteMany({});
    await Hive.deleteMany({});
    await User.deleteMany({});
    
    await Farmer.init();
    await User.init();

    // 0. Seed Admin and Beekeeper Users
    console.log("Seeding initial users...");
    const adminUser = await User.create({
        email: 'admin@buzz-off.io',
        displayName: 'Buzz Admin',
        role: 'admin',
        firebaseUid: 'admin-uid-fixed-001'
    });
    
    const demoBeekeeper = await User.create({
        email: 'demo@buzz-off.io',
        displayName: 'Demo Beekeeper',
        role: 'beekeeper',
        firebaseUid: 'demo-uid-fixed-001'
    });

    // 1. Seed Farmers
    const totalFarmers = 300;
    const farmers = [];
    
    for (let i = 0; i < totalFarmers; i++) {
        const cluster = CLUSTERS[i % CLUSTERS.length];
        const { lat, lng } = generateClusteredCoord(cluster);
        
        farmers.push({
            name: faker.person.fullName(),
            phone: faker.phone.number(),
            crop_type: faker.helpers.arrayElements(CROP_TYPES, { min: 1, max: 2 }),
            status: Math.random() > 0.15 ? 'approved' : 'pending',
            location: {
                type: 'Point',
                coordinates: [lng, lat]
            }
        });
    }
    
    await Farmer.insertMany(farmers);
    console.log(`✅ Seeded ${totalFarmers} clustered farmers in Tamil Nadu.`);

    // 2. Seed GeoTiles for Heatmap
    console.log("Seeding GeoTiles...");
    let tiles = [];
    const month = new Date().getMonth() + 1;
    
    const STEP = 0.08;
    for (let cLat = 8.0; cLat <= 14.0; cLat += STEP) {
        for (let cLng = 76.0; cLng <= 81.0; cLng += STEP) {
             let minDist = 999;
             for (const cl of CLUSTERS) {
                 const d = Math.sqrt(Math.pow(cLat - cl.lat, 2) + Math.pow(cLng - cl.lng, 2));
                 if (d < minDist) minDist = d;
             }
             
             let mockScore = Math.max(25, 95 - (minDist * 40));
             mockScore += (Math.random() * 12 - 6);
             if (mockScore > 100) mockScore = 100;

             tiles.push({
                 tileKey: toTileKey(cLat, cLng, month),
                 lat: cLat, lng: cLng, month,
                 mlScore: mockScore,
                 computedAt: new Date(),
                 ttlExpires: new Date(Date.now() + 24 * 60 * 60 * 1000)
             });
        }
    }

    await GeoTile.insertMany(tiles);
    console.log(`✅ Seeded ${tiles.length} GeoTiles.`);

    // 3. Seed Demo Hives
    console.log("Seeding demo hives...");
    const QUEEN_STATUSES = ['healthy', 'missing', 'replaced'];
    const HEALTH_STATUSES = ['good', 'fair', 'poor'];
    const demoHives = [];

    for (let i = 0; i < 50; i++) {
        const cluster = CLUSTERS[i % CLUSTERS.length];
        const { lat, lng } = generateClusteredCoord({ ...cluster, spread: cluster.spread * 0.4 });
        
        const daysAgo = Math.floor(Math.random() * 20);
        const inspDate = new Date(Date.now() - daysAgo * 86400000);
        
        demoHives.push({
            uid: demoBeekeeper.firebaseUid,
            hive_id: `TN-${String(i + 1).padStart(3, '0')}`,
            lat, lng,
            box_count: Math.floor(Math.random() * 3) + 1,
            queen_status: faker.helpers.arrayElement(QUEEN_STATUSES),
            health_status: faker.helpers.weightedArrayElement([
                { value: 'good', weight: 7 },
                { value: 'fair', weight: 2 },
                { value: 'poor', weight: 1 }
            ]),
            last_inspection_date: inspDate,
            notes: faker.helpers.arrayElement([
                'Active forage, pollen coming in',
                'Colony expanding into 2nd deep',
                'Calm bees, high nectar flow',
                'Good brood pattern'
            ]),
            syncVersion: 1
        });
    }

    await Hive.insertMany(demoHives);
    console.log(`✅ Seeded ${demoHives.length} demo hives.`);

  } catch (error) {
    console.error("Seeding error:", error);
  } finally {
    mongoose.disconnect();
    process.exit();
  }
};

runSeeder();
