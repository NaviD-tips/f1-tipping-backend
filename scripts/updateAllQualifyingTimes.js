// CREATE: scripts/updateAllQualifyingTimes.js
// Add qualifying times to all production race records that are missing them

const mongoose = require('mongoose');
const Race = require('../models/Race');
const ergastService = require('../services/ergastService');

// Use production MongoDB URI directly
const PRODUCTION_MONGODB_URI = 'mongodb+srv://clintpmorrison:YIplQKS8BuBA2ddO@tippiingcluster1.1o5la.mongodb.net/?retryWrites=true&w=majority&appName=TippiingCluster1';

async function updateAllQualifyingTimes() {
  try {
    console.log('🌐 Connecting to PRODUCTION MongoDB...');
    await mongoose.connect(PRODUCTION_MONGODB_URI);
    console.log('✅ Connected to PRODUCTION MongoDB');
    
    // Get all API race data with qualifying times
    console.log('\n🔍 Fetching all race data from API...');
    const apiRaces = await ergastService.fetchRaces('2025');
    console.log(`✅ Fetched ${apiRaces.length} races from API`);
    
    // Get all production races
    console.log('\n📋 Getting all production races...');
    const productionRaces = await Race.find({ season: "2025" }).sort({ round: 1 });
    console.log(`✅ Found ${productionRaces.length} races in production`);
    
    // Track updates
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    console.log('\n🔧 Processing each race...');
    
    for (const prodRace of productionRaces) {
      try {
        console.log(`\n📍 Processing Round ${prodRace.round}: ${prodRace.raceName}`);
        console.log(`   ID: ${prodRace._id}`);
        console.log(`   Current qualifying: ${prodRace.qualifyingDateTime || 'NOT SET'}`);
        
        // Skip if already has qualifying time
        if (prodRace.qualifyingDateTime) {
          console.log('   ⏭️  Already has qualifying time - skipping');
          skippedCount++;
          continue;
        }
        
        // Find matching race in API data
        const apiRace = apiRaces.find(race => 
          race.raceName === prodRace.raceName && 
          race.season === prodRace.season
        );
        
        if (!apiRace) {
          console.log('   ❌ No matching race found in API data');
          errorCount++;
          continue;
        }
        
        if (!apiRace.qualifyingDateTime) {
          console.log('   ⚠️  API race has no qualifying time');
          errorCount++;
          continue;
        }
        
        // Update the production race with qualifying time
        console.log(`   ✅ Adding qualifying time: ${apiRace.qualifyingDateTime.toISOString()}`);
        prodRace.qualifyingDateTime = apiRace.qualifyingDateTime;
        await prodRace.save();
        
        console.log('   ✅ Successfully updated');
        updatedCount++;
        
      } catch (error) {
        console.log(`   ❌ Error updating ${prodRace.raceName}: ${error.message}`);
        errorCount++;
      }
    }
    
    // Summary
    console.log('\n🏁 UPDATE COMPLETE!');
    console.log('=' .repeat(50));
    console.log(`✅ Updated: ${updatedCount} races`);
    console.log(`⏭️  Skipped: ${skippedCount} races (already had qualifying times)`);
    console.log(`❌ Errors: ${errorCount} races`);
    console.log(`📊 Total: ${updatedCount + skippedCount + errorCount} races processed`);
    
    // Verification - count races with qualifying times now
    const racesWithQualifying = await Race.countDocuments({ 
      season: "2025", 
      qualifyingDateTime: { $ne: null, $exists: true } 
    });
    const totalRaces = await Race.countDocuments({ season: "2025" });
    
    console.log(`\n📈 Final status:`);
    console.log(`   Races with qualifying times: ${racesWithQualifying}/${totalRaces}`);
    
    if (racesWithQualifying === totalRaces) {
      console.log('🎉 SUCCESS! All races now have qualifying times!');
    } else {
      console.log(`⚠️  ${totalRaces - racesWithQualifying} races still missing qualifying times`);
    }
    
    // Show upcoming races that should have closed predictions
    console.log('\n⏰ Prediction status check:');
    const now = new Date();
    const allRaces = await Race.find({ season: "2025" }).sort({ round: 1 });
    
    allRaces.forEach(race => {
      if (race.qualifyingDateTime) {
        const qualifyingTime = new Date(race.qualifyingDateTime);
        const closingTime = new Date(qualifyingTime.getTime() - (2 * 60 * 1000));
        const shouldBeClosed = now > closingTime;
        
        if (shouldBeClosed) {
          console.log(`   🔒 ${race.raceName}: Predictions should be CLOSED`);
        } else {
          const timeLeft = Math.round((closingTime - now) / (1000 * 60 * 60 * 24));
          console.log(`   🟢 ${race.raceName}: Open (closes in ~${timeLeft} days)`);
        }
      } else {
        console.log(`   ❌ ${race.raceName}: No qualifying time - stays open`);
      }
    });
    
  } catch (error) {
    console.error('❌ Update failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🌐 Disconnected from production MongoDB');
  }
}

// Run the update for all races
updateAllQualifyingTimes();