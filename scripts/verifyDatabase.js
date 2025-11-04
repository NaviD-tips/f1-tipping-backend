// CREATE: scripts/verifyDatabase.js
// Check what's actually in the MongoDB database

require('dotenv').config();

const mongoose = require('mongoose');
const Race = require('../models/Race');

async function verifyDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get the Spanish Grand Prix race
    const spanishGP = await Race.findOne({ 
      raceName: "Spanish Grand Prix", 
      season: "2025" 
    });
    
    if (spanishGP) {
      console.log('\n🇪🇸 Spanish Grand Prix in Database:');
      console.log('Full document:');
      console.log(JSON.stringify(spanishGP.toObject(), null, 2));
      
      console.log('\n📊 Key fields:');
      console.log('Race Name:', spanishGP.raceName);
      console.log('Date:', spanishGP.date);
      console.log('Qualifying DateTime:', spanishGP.qualifyingDateTime);
      console.log('Has qualifyingDateTime field:', spanishGP.hasOwnProperty('qualifyingDateTime'));
      console.log('QualifyingDateTime type:', typeof spanishGP.qualifyingDateTime);
    } else {
      console.log('❌ Spanish Grand Prix not found in database');
    }
    
    // Check a few other races too
    console.log('\n🏁 Other races:');
    const otherRaces = await Race.find({}).limit(3);
    otherRaces.forEach(race => {
      console.log(`${race.raceName}: qualifyingDateTime = ${race.qualifyingDateTime}`);
    });
    
    // Count how many races have qualifying times
    const racesWithQualifying = await Race.countDocuments({ 
      qualifyingDateTime: { $ne: null, $exists: true } 
    });
    const totalRaces = await Race.countDocuments();
    console.log(`\n📈 Summary: ${racesWithQualifying}/${totalRaces} races have qualifying times`);
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

verifyDatabase();