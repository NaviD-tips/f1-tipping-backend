// CREATE: scripts/safeProductionUpdate.js
// Safely add qualifying times to existing production race records

const mongoose = require('mongoose');
const Race = require('../models/Race');
const ergastService = require('../services/ergastService');

// Use production MongoDB URI directly
const PRODUCTION_MONGODB_URI = 'mongodb+srv://clintpmorrison:YIplQKS8BuBA2ddO@tippiingcluster1.1o5la.mongodb.net/?retryWrites=true&w=majority&appName=TippiingCluster1';

async function safeProductionUpdate() {
  try {
    console.log('🌐 Connecting to PRODUCTION MongoDB...');
    await mongoose.connect(PRODUCTION_MONGODB_URI);
    console.log('✅ Connected to PRODUCTION MongoDB');
    
    // Get Spanish Grand Prix specifically
    const spanishGPId = '67df7835b142568bb5fddc84';
    const spanishGP = await Race.findById(spanishGPId);
    
    if (!spanishGP) {
      console.log('❌ Spanish Grand Prix not found!');
      return;
    }
    
    console.log(`\n🇪🇸 Spanish Grand Prix found:`);
    console.log(`   ID: ${spanishGP._id}`);
    console.log(`   Name: ${spanishGP.raceName}`);
    console.log(`   Current qualifying: ${spanishGP.qualifyingDateTime || 'NOT SET'}`);
    
    if (spanishGP.qualifyingDateTime) {
      console.log('✅ Spanish Grand Prix already has qualifying time - no update needed');
      return;
    }
    
    // Get qualifying time from API
    console.log('\n🔍 Fetching qualifying time from API...');
    const apiRaces = await ergastService.fetchRaces('2025');
    const spanishGPFromAPI = apiRaces.find(race => race.raceName === "Spanish Grand Prix");
    
    if (!spanishGPFromAPI || !spanishGPFromAPI.qualifyingDateTime) {
      console.log('❌ Could not get qualifying time from API');
      return;
    }
    
    console.log(`✅ API qualifying time: ${spanishGPFromAPI.qualifyingDateTime.toISOString()}`);
    
    // SAFELY update the existing record
    console.log('\n🔧 Adding qualifying time to existing Spanish Grand Prix record...');
    console.log(`   This will UPDATE race ID: ${spanishGP._id}`);
    console.log(`   This will NOT create new records`);
    console.log(`   This will NOT affect predictions`);
    
    // Update the existing record
    spanishGP.qualifyingDateTime = spanishGPFromAPI.qualifyingDateTime;
    await spanishGP.save();
    
    console.log('✅ Spanish Grand Prix updated successfully!');
    
    // Verify the update
    const updatedRace = await Race.findById(spanishGPId);
    console.log('\n🔍 Verification:');
    console.log(`   Race ID: ${updatedRace._id}`);
    console.log(`   Qualifying time: ${updatedRace.qualifyingDateTime.toISOString()}`);
    
    // Check if predictions should now be closed
    const now = new Date();
    const qualifyingTime = new Date(updatedRace.qualifyingDateTime);
    const closingTime = new Date(qualifyingTime.getTime() - (2 * 60 * 1000));
    
    console.log(`\n⏰ Timing check:`);
    console.log(`   Current time: ${now.toISOString()}`);
    console.log(`   Qualifying time: ${qualifyingTime.toISOString()}`);
    console.log(`   Predictions close at: ${closingTime.toISOString()}`);
    console.log(`   Should be closed: ${now > closingTime ? '✅ YES' : '❌ NO'}`);
    
    console.log('\n🎉 Spanish Grand Prix qualifying time successfully added!');
    console.log('🔒 Predictions should now close properly based on the qualifying time.');
    
  } catch (error) {
    console.error('❌ Update failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🌐 Disconnected from production MongoDB');
  }
}

// Run the safe update
safeProductionUpdate();