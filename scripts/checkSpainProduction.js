// CREATE: scripts/checkSpainProduction.js
// Check the current state of Spanish Grand Prix in production

require('dotenv').config();

const mongoose = require('mongoose');
const Race = require('../models/Race');

async function checkSpainProduction() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to production MongoDB');
    
    // Find ALL Spanish Grand Prix records
    const spanishGPRaces = await Race.find({ 
      raceName: "Spanish Grand Prix", 
      season: "2025" 
    });
    
    console.log(`\n🇪🇸 Found ${spanishGPRaces.length} Spanish Grand Prix records:`);
    
    spanishGPRaces.forEach((race, index) => {
      console.log(`\n${index + 1}. Race ID: ${race._id}`);
      console.log(`   Created: ${race.createdAt}`);
      console.log(`   Updated: ${race.updatedAt}`);
      console.log(`   Race Date: ${race.date}`);
      console.log(`   Qualifying: ${race.qualifyingDateTime || 'NOT SET'}`);
      console.log(`   Has headToHead: ${!!race.headToHead}`);
      console.log(`   Predictions Open: ${race.predictionsOpen}`);
      console.log(`   Results Processed: ${race.resultsProcessed}`);
    });
    
    // Check if the old race ID exists
    const oldRaceId = '67df7835b142568bb5fddc84';
    const oldRace = await Race.findById(oldRaceId);
    
    console.log(`\n🔍 Old race ID (${oldRaceId}):`);
    if (oldRace) {
      console.log('   ✅ EXISTS in database');
      console.log(`   Qualifying: ${oldRace.qualifyingDateTime || 'NOT SET'}`);
    } else {
      console.log('   ❌ DOES NOT EXIST in database');
    }
    
    // Check current time vs qualifying times
    const now = new Date();
    console.log(`\n⏰ Current time: ${now.toISOString()}`);
    
    spanishGPRaces.forEach((race, index) => {
      if (race.qualifyingDateTime) {
        const qualifyingTime = new Date(race.qualifyingDateTime);
        const closingTime = new Date(qualifyingTime.getTime() - (2 * 60 * 1000));
        
        console.log(`\n${index + 1}. Timing for race ${race._id}:`);
        console.log(`   Qualifying: ${qualifyingTime.toISOString()}`);
        console.log(`   Predictions close: ${closingTime.toISOString()}`);
        console.log(`   Should be closed: ${now > closingTime ? '✅ YES' : '❌ NO'}`);
      } else {
        console.log(`\n${index + 1}. Race ${race._id}: No qualifying time - predictions stay open`);
      }
    });
    
    // Check what races are in the dropdown
    console.log(`\n📋 All 2025 races (for dropdown):`);
    const allRaces = await Race.find({ season: "2025" }).sort({ round: 1 });
    allRaces.forEach(race => {
      const hasQualifying = !!race.qualifyingDateTime;
      console.log(`   Round ${race.round}: ${race.raceName} (${race._id}) - Qualifying: ${hasQualifying ? '✅' : '❌'}`);
    });
    
  } catch (error) {
    console.error('❌ Check failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkSpainProduction();