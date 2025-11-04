// CREATE: scripts/importRaces.js
// This script will import races with qualifying times

require('dotenv').config(); // Load environment variables from .env file

const mongoose = require('mongoose');
const Race = require('../models/Race');
const ergastService = require('../services/ergastService');

async function importRaces() {
  try {
    // Check if MongoDB URI is available
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set. Please check your .env file.');
    }
    
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // Fetch races from API (now includes qualifying times)
    console.log('Fetching races from API...');
    const apiRaces = await ergastService.fetchRaces('2025');
    console.log(`✅ Fetched ${apiRaces.length} races from API`);
    
    // Process each race
    let updatedCount = 0;
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const raceData of apiRaces) {
      try {
        // Check if race already exists
        const existingRace = await Race.findOne({
          season: raceData.season,
          round: raceData.round
        });
        
        if (existingRace) {
          // Update existing race with qualifying time if missing
          if (!existingRace.qualifyingDateTime && raceData.qualifyingDateTime) {
            existingRace.qualifyingDateTime = raceData.qualifyingDateTime;
            await existingRace.save();
            console.log(`✅ Updated ${raceData.raceName} with qualifying time: ${raceData.qualifyingDateTime?.toISOString()}`);
            updatedCount++;
          } else if (existingRace.qualifyingDateTime) {
            console.log(`⏭️  ${raceData.raceName} already has qualifying time`);
            skippedCount++;
          } else {
            console.log(`⚠️  ${raceData.raceName} has no qualifying time in API`);
            skippedCount++;
          }
        } else {
          // Create new race
          const newRace = new Race(raceData);
          await newRace.save();
          console.log(`✅ Created ${raceData.raceName} with qualifying time: ${raceData.qualifyingDateTime?.toISOString()}`);
          createdCount++;
        }
      } catch (error) {
        console.error(`❌ Error processing ${raceData.raceName}:`, error.message);
      }
    }
    
    console.log('\n🏁 Import completed!');
    console.log(`📊 Summary:`);
    console.log(`   - Created: ${createdCount} races`);
    console.log(`   - Updated: ${updatedCount} races`);
    console.log(`   - Skipped: ${skippedCount} races`);
    
    // Verify results
    const racesWithQualifying = await Race.countDocuments({ qualifyingDateTime: { $ne: null } });
    const totalRaces = await Race.countDocuments();
    console.log(`   - Total: ${racesWithQualifying}/${totalRaces} races have qualifying times`);
    
    // Show Spanish Grand Prix specifically
    const spanishGP = await Race.findOne({ raceName: "Spanish Grand Prix", season: "2025" });
    if (spanishGP) {
      console.log(`\n🇪🇸 Spanish Grand Prix:`);
      console.log(`   - Race date: ${spanishGP.date}`);
      console.log(`   - Qualifying: ${spanishGP.qualifyingDateTime || 'Not set'}`);
      console.log(`   - Predictions should close: ${spanishGP.qualifyingDateTime ? new Date(spanishGP.qualifyingDateTime.getTime() - 2 * 60 * 1000) : 'Cannot calculate'}`);
    }
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the import
importRaces();