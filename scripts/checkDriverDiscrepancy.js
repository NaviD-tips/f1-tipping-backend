// scripts/checkDriverDiscrepancy.js

const mongoose = require('mongoose');
const Driver = require('../models/Driver');
const ergastService = require('../services/ergastService');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    console.log(`Database: ${mongoose.connection.db.databaseName}`);
    console.log(`Driver collection: ${Driver.collection.name}`);
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

const checkDriverDiscrepancy = async () => {
  try {
    // Fetch all drivers from API
    console.log('Fetching drivers from API...');
    const apiDrivers = await ergastService.fetchDrivers();
    console.log(`API returned ${apiDrivers.length} drivers`);
    
    // List all API drivers
    console.log('\nDrivers from API:');
    apiDrivers.forEach((driver, index) => {
      console.log(`${index + 1}. ${driver.givenName} ${driver.familyName} (${driver.driverId})`);
    });
    
    // Get all driver IDs from API
    const apiDriverIds = apiDrivers.map(d => d.driverId).sort();
    
    // Fetch all drivers from database
    const dbDrivers = await Driver.find({}).lean();
    console.log(`\nDatabase contains ${dbDrivers.length} drivers`);
    
    // List all DB drivers
    console.log('\nDrivers in database:');
    dbDrivers.forEach((driver, index) => {
      console.log(`${index + 1}. ${driver.givenName} ${driver.familyName} (${driver.driverId})`);
    });
    
    // Get all driver IDs from database
    const dbDriverIds = dbDrivers.map(d => d.driverId).sort();
    
    // Find missing drivers
    const missingInDb = apiDriverIds.filter(id => !dbDriverIds.includes(id));
    const extraInDb = dbDriverIds.filter(id => !apiDriverIds.includes(id));
    
    console.log('\nAnalysis:');
    if (missingInDb.length > 0) {
      console.log('Drivers in API but missing from database:');
      missingInDb.forEach(id => {
        const driver = apiDrivers.find(d => d.driverId === id);
        console.log(`- ${driver.givenName} ${driver.familyName} (${id})`);
      });
    } else {
      console.log('All API drivers are in the database');
    }
    
    if (extraInDb.length > 0) {
      console.log('\nDrivers in database but not in API:');
      extraInDb.forEach(id => {
        const driver = dbDrivers.find(d => d.driverId === id);
        console.log(`- ${driver.givenName} ${driver.familyName} (${id})`);
      });
    } else {
      console.log('No extra drivers in database');
    }
    
    // Check if we have the right database
    console.log('\nDatabase information:');
    console.log(`MongoDB URI: ${process.env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);
    console.log(`Database name: ${mongoose.connection.db.databaseName}`);
    console.log(`Collection name: ${Driver.collection.name}`);
    
  } catch (error) {
    console.error('Error checking driver discrepancy:', error);
  } finally {
    mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
};

checkDriverDiscrepancy();