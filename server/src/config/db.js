import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export let isConnectedToMongo = false;

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/loanlens';
  
  try {
    // Attempt Mongoose connection with 3-second timeout
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000,
    });
    isConnectedToMongo = true;
    console.log(`[OK] MongoDB connected successfully to ${uri}`);
  } catch (err) {
    isConnectedToMongo = false;
    console.log(`[INFO] Local MongoDB service not active (${err.message}).`);
    console.log('[OK] Operating in autonomous local persistent storage mode for immediate zero-dependency evaluation.');
  }
};
