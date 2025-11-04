// scripts/updateDrivers.js - improved version

const mongoose = require('mongoose');
const Driver = require('../models/Driver');
const ergastService = require('../services/ergastService');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

const updateDrivers = async () => {
  try {
    console.log('Starting driver update process...');
    
    // Check existing drivers count
    const existingCount = await Driver.countDocuments({});
    console.log(`Current driver count in database: ${existingCount}`);
    
    // Fetch drivers from API
    console.log('Fetching drivers from Jolpica API...');
    const apiDrivers = await ergastService.fetchDrivers();
    
    if (!apiDrivers || apiDrivers.length === 0) {
      console.log('No drivers returned from API');
      process.exit(0);
    }
    
    console.log(`Fetched ${apiDrivers.length} drivers from API`);
    
    // Log driver details before insertion
    console.log('Drivers to be inserted:');
    apiDrivers.forEach((driver, index) => {
      console.log(`${index + 1}. ${driver.givenName} ${driver.familyName} (${driver.driverId})`);
    });
    
    // Remove existing drivers
    console.log('Removing existing drivers...');
    await Driver.deleteMany({});
    
    // Insert new drivers one by one to catch any errors
    console.log('Inserting new drivers...');
    let successCount = 0;
    let errorCount = 0;
    
    for (const driver of apiDrivers) {
      try {
        await Driver.create(driver);
        successCount++;
        console.log(`✅ Added driver: ${driver.givenName} ${driver.familyName}`);
      } catch (err) {
        errorCount++;
        console.error(`❌ Failed to add driver: ${driver.givenName} ${driver.familyName}`);
        console.error(`   Error: ${err.message}`);
      }
    }
    
    // Double check the final count
    const finalCount = await Driver.countDocuments({});
    
    console.log('\nSummary:');
    console.log(`- Drivers from API: ${apiDrivers.length}`);
    console.log(`- Successfully added: ${successCount}`);
    console.log(`- Failed to add: ${errorCount}`);
    console.log(`- Final count in database: ${finalCount}`);
    
    if (finalCount !== apiDrivers.length) {
      console.log('\n⚠️ Warning: Discrepancy between API drivers and database count');
    }
    
    console.log('Driver update completed');
  } catch (error) {
    console.error('Error updating drivers:', error);
  } finally {
    // Close the database connection
    mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the update function
updateDrivers();