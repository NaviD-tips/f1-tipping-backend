// CREATE: scripts/productionReadOnlyCheck.js
// READ-ONLY check of production database - NO CHANGES MADE

const mongoose = require('mongoose');
const Race = require('../models/Race');

// Use production MongoDB URI directly
const PRODUCTION_MONGODB_URI = 'mongodb+srv://clintpmorrison:YIplQKS8BuBA2ddO@tippiingcluster1.1o5la.mongodb.net/?retryWrites=true&w=majority&appName=TippiingCluster1';

async function productionReadOnlyCheck() {
  try {
    console.log('🌐 Connecting to PRODUCTION MongoDB (READ-ONLY)...');
    await mongoose.connect(PRODUCTION_MONGODB_URI);
    console.log('✅ Connected to PRODUCTION MongoDB');
    
    console.log('\n📋 PRODUCTION DATABASE ANALYSIS (NO CHANGES MADE)');
    console.log('=' .repeat(60));
    
    // Check Spanish Grand Prix
    const spanishGPRaces = await Race.find({
      raceName: "Spanish Grand Prix",
      season: "2025"
    });
    
    console.log(`\n🇪🇸 Spanish Grand Prix records found: ${spanishGPRaces.length}`);
    
    spanishGPRaces.forEach((race, index) => {
      console.log(`\n${index + 1}. Race ID: ${race._id}`);
      console.log(`   Created: ${race.createdAt}`);
      console.log(`   Race Date: ${race.date}`);
      console.log(`   Qualifying DateTime: ${race.qualifyingDateTime || 'NOT SET'}`);
      console.log(`   Has headToHead: ${!!race.headToHead}`);
      console.log(`   Predictions Open: ${race.predictionsOpen}`);
      console.log(`   Results Processed: ${race.resultsProcessed}`);
    });
    
    // Check if the old race ID exists
    const oldRaceId = '67df7835b142568bb5fddc84';
    console.log(`\n🔍 Checking for old race ID: ${oldRaceId}`);
    const oldRace = await Race.findById(oldRaceId);
    
    if (oldRace) {
      console.log('   ✅ OLD RACE ID EXISTS in production');
      console.log(`   Race Name: ${oldRace.raceName}`);
      console.log(`   Qualifying: ${oldRace.qualifyingDateTime || 'NOT SET'}`);
      console.log(`   Has headToHead: ${!!oldRace.headToHead}`);
    } else {
      console.log('   ❌ OLD RACE ID DOES NOT EXIST in production');
    }
    
    // Check all races for qualifying times
    console.log(`\n📊 All 2025 races in production:`);
    const allRaces = await Race.find({ season: "2025" }).sort({ round: 1 });
    
    let racesWithQualifying = 0;
    allRaces.forEach(race => {
      const hasQualifying = !!race.qualifyingDateTime;
      if (hasQualifying) racesWithQualifying++;
      
      console.log(`   Round ${race.round}: ${race.raceName}`);
      console.log(`      ID: ${race._id}`);
      console.log(`      Qualifying: ${hasQualifying ? '✅' : '❌'}`);
    });
    
    console.log(`\n📈 Summary:`);
    console.log(`   Total races: ${allRaces.length}`);
    console.log(`   Races with qualifying times: ${racesWithQualifying}`);
    console.log(`   Races missing qualifying times: ${allRaces.length - racesWithQualifying}`);
    
    // Check for any predictions
    try {
      const db = mongoose.connection.db;
      const predictionsCollection = db.collection('predictions');
      const predictionCount = await predictionsCollection.countDocuments();
      console.log(`\n📝 Total predictions in production: ${predictionCount}`);
      
      if (predictionCount > 0) {
        // Sample a few predictions to see which race IDs they reference
        const samplePredictions = await predictionsCollection.find({}).limit(5).toArray();
        console.log(`\n📋 Sample prediction race IDs:`);
        samplePredictions.forEach((pred, index) => {
          console.log(`   ${index + 1}. Race ID: ${pred.race}`);
        });
      }
    } catch (err) {
      console.log('📝 Could not check predictions collection');
    }
    
    console.log('\n🛡️  NO CHANGES WERE MADE - This was a read-only check');
    
  } catch (error) {
    console.error('❌ Production check failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🌐 Disconnected from production MongoDB');
  }
}

// Run the read-only check
productionReadOnlyCheck();