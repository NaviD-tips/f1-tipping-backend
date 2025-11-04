// C:\Users\clint\f1-tipping-site\backend\scripts\updateDriversProduction.js

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Driver = require('../models/Driver');
const ergastService = require('../services/ergastService');
const fs = require('fs');
const path = require('path');

/**
 * Get MongoDB URI from a specific .env file
 * @param {string} envFilePath - Path to the .env file
 * @return {string} - The MongoDB URI
 */
const getMongoUriFromEnvFile = (envFilePath) => {
  if (!fs.existsSync(envFilePath)) {
    console.error(`Environment file not found: ${envFilePath}`);
    return null;
  }
  
  const envContent = fs.readFileSync(envFilePath, 'utf8');
  const mongoUriMatch = envContent.match(/MONGODB_URI=(.+)/);
  
  if (mongoUriMatch && mongoUriMatch[1]) {
    return mongoUriMatch[1].trim();
  }
  
  return null;
};

/**
 * Update drivers in the database from the Ergast API
 * @param {boolean} [useProduction=false] - Whether to use production environment
 */
const updateDrivers = async (useProduction = false) => {
  try {
    let mongoUri;
    
    if (useProduction) {
      console.log('Using production environment...');
      // Explicitly read from .env.production file
      const prodEnvPath = path.join(__dirname, '..', '.env.production');
      mongoUri = getMongoUriFromEnvFile(prodEnvPath);
      
      if (!mongoUri) {
        console.error('Failed to get MongoDB URI from production environment file');
        return;
      }
    } else {
      // Load default environment
      dotenv.config();
      mongoUri = process.env.MONGODB_URI;
    }
    
    console.log(`Connecting to MongoDB: ${mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);
    
    // Connect to database
    await mongoose.connect(mongoUri);
    console.log(`Connected to database: ${mongoose.connection.db.databaseName}`);
    
    console.log('Starting driver update process...');
    
    // Check existing drivers count
    const existingCount = await Driver.countDocuments({});
    console.log(`Current driver count in database: ${existingCount}`);
    
    // Fetch drivers from API
    console.log('Fetching drivers from Jolpica API...');
    const apiDrivers = await ergastService.fetchDrivers();
    
    if (!apiDrivers || apiDrivers.length === 0) {
      console.log('No drivers returned from API');
      return;
    }
    
    console.log(`Fetched ${apiDrivers.length} drivers from API`);
    
    // Remove existing drivers
    console.log('Removing existing drivers from database...');
    await Driver.deleteMany({});
    
    // Insert new drivers
    console.log('Inserting new drivers to database...');
    const insertedDrivers = await Driver.insertMany(apiDrivers);
    console.log(`Successfully inserted ${insertedDrivers.length} drivers to database`);
    
    // Double check the final count
    const finalCount = await Driver.countDocuments({});
    console.log(`Final count in database: ${finalCount}`);
    
    if (finalCount !== apiDrivers.length) {
      console.warn(`Warning: Expected to insert ${apiDrivers.length} drivers but found ${finalCount} in database`);
    } else {
      console.log('Driver update completed successfully');
    }
    
    return insertedDrivers;
  } catch (error) {
    console.error('Error updating drivers:', error.message);
    throw error;
  } finally {
    // Disconnect from database
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('Database connection closed');
    }
  }
};

// If script is run directly from command line
if (require.main === module) {
  // Check if production flag is provided
  const useProduction = process.argv.includes('--production');
  
  updateDrivers(useProduction)
    .then(() => {
      console.log('Driver update process completed');
      process.exit(0);
    })
    .catch(err => {
      console.error('Error:', err.message);
      process.exit(1);
    });
}

module.exports = { updateDrivers };