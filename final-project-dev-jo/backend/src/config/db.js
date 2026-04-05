import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/buzzoff');
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    global.IS_MOCKED_DB = false;
  } catch (error) {
    logger.error(`⚠️ MongoDB Connection Failed: ${error.message}`);
    logger.warn('⚠️ Starting in MOCK DB MODE for local development/testing.');
    global.IS_MOCKED_DB = true;
    // Don't exit - allow server to start for UI testing
  }
};

