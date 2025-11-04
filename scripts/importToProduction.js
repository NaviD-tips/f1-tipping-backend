// CREATE: scripts/importToProduction.js
// Import qualifying times to PRODUCTION database

const mongoose = require('mongoose');
const Race = require('../models/Race');
const ergastService = require('../services/ergastService');

// Use production MongoDB URI directly
const PRODUCTION_MONGODB_URI = 'mongodb+srv://clintpmorrison:YIplQKS8BuBA2ddO@tippiingcluster1.1o5la.mongodb.net/?retryWrites=true&w=majority&appName=TippiingCluster1';

async function importToProduction() {
  try {
    console.log('🌐 Connecting to PRODUCTION MongoDB...');
    await mongoose.connect(PRODUCTION_MONGODB_URI);
    console.log('✅ Connected to PRODUCTION MongoDB');
    
    // Check current Spanish Grand Prix in production
    const currentSpanishGP = await Race.findOne({
      raceName: "Spanish Grand Prix",
      season: "2025"
    });
    
    if (currentSpanishGP) {
      console.log('\n🇪🇸 Current Spanish GP in production:');
      console.log(`   ID: ${currentSpanishGP._id}`);
      console.log(`   Qualifying: ${currentSpanishGP.qualifyingDateTime || 'NOT SET'}`);
    }
    
    // Fetch qualifying time from API
    console.log('\n🔍 Fetching Spanish GP qualifying time from API...');
    const apiRaces = await ergastService.fetchRaces('2025');
    const spanishGPFromAPI = apiRaces.find(race => race.raceName === "Spanish Grand Prix");
    
    if (spanishGPFromAPI && spanishGPFromAPI.qualifyingDateTime) {
      console.log(`✅ API has qualifying time: ${spanishGPFromAPI.qualifyingDateTime.toISOString()}`);
      
      if (currentSpanishGP && !currentSpanishGP.qualifyingDateTime) {
        console.log('\n🔧 Adding qualifying time to existing race...');
        currentSpanishGP.qualifyingDateTime = spanishGPFromAPI.qualifyingDateTime;
        await currentSpanishGP.save();
        console.log(`✅ Updated Spanish GP (${currentSpanishGP._id}) with qualifying time`);
      } else if (currentSpanishGP && currentSpanishGP.qualifyingDateTime) {
        console.log('✅ Spanish GP already has qualifying time');
      } else {
        console.log('❌ No Spanish GP found in production database');
      }
    } else {
      console.log('❌ Could not get qualifying time from API');
    }
    
    // Verify the update worked
    console.log('\n🔍 Verification:');
    const updatedRace = await Race.findOne({
      raceName: "Spanish Grand Prix",
      season: "2025"
    });
    
    if (updatedRace && updatedRace.qualifyingDateTime) {
      const now = new Date();
      const qualifyingTime = new Date(updatedRace.qualifyingDateTime);
      const closingTime = new Date(qualifyingTime.getTime() - (2 * 60 * 1000));
      
      console.log(`✅ Spanish GP now has qualifying time: ${qualifyingTime.toISOString()}`);
      console.log(`⏰ Predictions should close at: ${closingTime.toISOString()}`);
      console.log(`🔒 Should be closed now: ${now > closingTime ? 'YES' : 'NO'}`);
    } else {
      console.log('❌ Spanish GP still missing qualifying time');
    }
    
  } catch (error) {
    console.error('❌ Production import failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🌐 Disconnected from production MongoDB');
  }
}

// Run the production import
importToProduction();