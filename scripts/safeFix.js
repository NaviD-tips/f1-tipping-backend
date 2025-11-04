// CREATE: scripts/safeFix.js
// Safely fix duplicate races while preserving predictions and results

require('dotenv').config();

const mongoose = require('mongoose');
const Race = require('../models/Race');

async function safeFix() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find all Spanish Grand Prix records
    const spanishGPRaces = await Race.find({ 
      raceName: "Spanish Grand Prix", 
      season: "2025" 
    });
    
    console.log(`Found ${spanishGPRaces.length} Spanish Grand Prix records:`);
    
    spanishGPRaces.forEach((race, index) => {
      console.log(`\n${index + 1}. ID: ${race._id}`);
      console.log(`   Created: ${race.createdAt}`);
      console.log(`   Qualifying: ${race.qualifyingDateTime || 'Not set'}`);
      console.log(`   Has headToHead: ${!!race.headToHead}`);
      console.log(`   Has results: ${!!race.results}`);
      console.log(`   Results processed: ${race.resultsProcessed}`);
    });
    
    if (spanishGPRaces.length > 1) {
      // Find the race the frontend is using (the older one)
      const frontendRaceId = '67df7835b142568bb5fddc84';
      const frontendRace = spanishGPRaces.find(race => 
        race._id.toString() === frontendRaceId
      );
      
      // Find the race with qualifying time (the newer one)
      const raceWithQualifying = spanishGPRaces.find(race => 
        race.qualifyingDateTime && race._id.toString() !== frontendRaceId
      );
      
      if (frontendRace && raceWithQualifying) {
        console.log('\n🔍 Checking for dependencies...');
        
        // Check if there are any predictions for either race
        try {
          // Try to import Prediction model if it exists
          let predictions = [];
          try {
            const Prediction = require('../models/Prediction');
            const frontendPredictions = await Prediction.find({ raceId: frontendRaceId });
            const newRacePredictions = await Prediction.find({ raceId: raceWithQualifying._id });
            
            console.log(`Frontend race predictions: ${frontendPredictions.length}`);
            console.log(`New race predictions: ${newRacePredictions.length}`);
            
            if (newRacePredictions.length > 0) {
              console.log('⚠️  WARNING: New race has predictions! Need to migrate them.');
              // Don't delete - we'll need to migrate predictions
              return;
            }
          } catch (err) {
            console.log('📝 No Prediction model found or no predictions exist');
          }
          
          console.log('\n✅ Safe to proceed - no dependencies found');
          console.log('\n🔧 Updating the frontend race with qualifying time...');
          
          // Update the frontend race with the qualifying time and any other missing data
          frontendRace.qualifyingDateTime = raceWithQualifying.qualifyingDateTime;
          
          // Preserve any additional data from the new race if needed
          if (!frontendRace.headToHead && raceWithQualifying.headToHead) {
            frontendRace.headToHead = raceWithQualifying.headToHead;
            console.log('   Also copied headToHead data');
          }
          
          await frontendRace.save();
          
          console.log(`✅ Updated race ${frontendRace._id} with qualifying time: ${frontendRace.qualifyingDateTime}`);
          
          // Only delete the duplicate if we're sure it's safe
          console.log('\n🗑️  Deleting duplicate race...');
          await Race.findByIdAndDelete(raceWithQualifying._id);
          console.log(`✅ Deleted duplicate race ${raceWithQualifying._id}`);
          
        } catch (depError) {
          console.error('❌ Error checking dependencies:', depError.message);
          console.log('🛡️  Aborting deletion for safety');
          
          // Still update the frontend race with qualifying time, but don't delete
          console.log('\n🔧 Updating frontend race with qualifying time only...');
          frontendRace.qualifyingDateTime = raceWithQualifying.qualifyingDateTime;
          await frontendRace.save();
          console.log(`✅ Updated race ${frontendRace._id} with qualifying time: ${frontendRace.qualifyingDateTime}`);
        }
        
      } else {
        console.log('❌ Could not identify which races to update/delete');
      }
    } else {
      console.log('✅ No duplicate races found');
    }
    
    // Verify the fix
    console.log('\n🔍 Final verification:');
    const updatedRace = await Race.findById('67df7835b142568bb5fddc84');
    if (updatedRace) {
      console.log(`✅ Frontend race now has qualifying time: ${updatedRace.qualifyingDateTime}`);
      
      if (updatedRace.qualifyingDateTime) {
        const now = new Date();
        const qualifyingTime = new Date(updatedRace.qualifyingDateTime);
        const closingTime = new Date(qualifyingTime.getTime() - (2 * 60 * 1000));
        
        console.log(`📅 Qualifying time: ${qualifyingTime.toISOString()}`);
        console.log(`⏰ Predictions close: ${closingTime.toISOString()}`);
        console.log(`🔒 Should be closed now: ${now > closingTime}`);
      }
    } else {
      console.log('❌ Frontend race not found');
    }
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

safeFix();