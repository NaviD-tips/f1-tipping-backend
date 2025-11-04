// CREATE: scripts/debugImport.js
// Debug script to see what's happening with the import

require('dotenv').config();

const mongoose = require('mongoose');
const Race = require('../models/Race');
const ergastService = require('../services/ergastService');

async function debugImport() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Test the API call first
    console.log('\n🔍 Testing API call...');
    const apiRaces = await ergastService.fetchRaces('2025');
    
    // Find Spanish Grand Prix in API response
    const spanishGPFromAPI = apiRaces.find(race => race.raceName === "Spanish Grand Prix");
    
    if (spanishGPFromAPI) {
      console.log('\n🇪🇸 Spanish Grand Prix from API:');
      console.log('Race Name:', spanishGPFromAPI.raceName);
      console.log('Season:', spanishGPFromAPI.season);
      console.log('Round:', spanishGPFromAPI.round);
      console.log('Race Date:', spanishGPFromAPI.date);
      console.log('Qualifying DateTime:', spanishGPFromAPI.qualifyingDateTime);
      console.log('Has qualifying time:', !!spanishGPFromAPI.qualifyingDateTime);
    } else {
      console.log('❌ Spanish Grand Prix not found in API response');
      console.log('Available races:', apiRaces.map(r => r.raceName));
    }
    
    // Check what's in the database
    console.log('\n🗄️  Spanish Grand Prix from Database:');
    const spanishGPFromDB = await Race.findOne({ 
      raceName: "Spanish Grand Prix", 
      season: "2025" 
    });
    
    if (spanishGPFromDB) {
      console.log('Race Name:', spanishGPFromDB.raceName);
      console.log('Season:', spanishGPFromDB.season);
      console.log('Round:', spanishGPFromDB.round);
      console.log('Race Date:', spanishGPFromDB.date);
      console.log('Qualifying DateTime:', spanishGPFromDB.qualifyingDateTime);
      console.log('Has qualifying time:', !!spanishGPFromDB.qualifyingDateTime);
      
      // Try to update it manually
      if (spanishGPFromAPI && spanishGPFromAPI.qualifyingDateTime && !spanishGPFromDB.qualifyingDateTime) {
        console.log('\n🔧 Manually updating qualifying time...');
        spanishGPFromDB.qualifyingDateTime = spanishGPFromAPI.qualifyingDateTime;
        await spanishGPFromDB.save();
        console.log('✅ Updated qualifying time:', spanishGPFromDB.qualifyingDateTime);
      }
    } else {
      console.log('❌ Spanish Grand Prix not found in database');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

debugImport();