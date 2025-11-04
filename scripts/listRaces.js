// C:\Users\clint\f1-tipping-site\backend\scripts\listRaces.js

require('dotenv').config();
const mongoose = require('mongoose');
const Race = require('../models/Race');

const listRaces = async () => {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find all races
    console.log('Fetching all races...');
    const races = await Race.find().sort({ season: -1, round: 1 });
    
    console.log(`Found ${races.length} races\n`);
    
    // Display races with their IDs
    console.log('Available races:');
    console.log('----------------');
    
    races.forEach(race => {
      console.log(`ID: ${race._id}`);
      console.log(`Name: ${race.raceName}`);
      console.log(`Season/Round: ${race.season} Round ${race.round}`);
      console.log(`Date: ${new Date(race.date).toLocaleDateString()}`);
      console.log(`Has Head-to-Head: ${race.headToHead ? 'Yes' : 'No'}`);
      console.log('----------------');
    });
    
    // If there are races with head-to-head data, highlight them
    const racesWithH2H = races.filter(race => race.headToHead);
    if (racesWithH2H.length > 0) {
      console.log('\nRaces with head-to-head data:');
      racesWithH2H.forEach(race => {
        console.log(`ID: ${race._id}, Name: ${race.raceName} (${race.season})`);
        
        // Show head-to-head details
        if (race.headToHead.drivers) {
          const driver1 = race.headToHead.drivers.driver1?.name || 'Not set';
          const driver2 = race.headToHead.drivers.driver2?.name || 'Not set';
          console.log(`  Driver H2H: ${driver1} vs ${driver2}`);
        }
        
        if (race.headToHead.teams) {
          const team1 = race.headToHead.teams.team1?.name || 'Not set';
          const team2 = race.headToHead.teams.team2?.name || 'Not set';
          console.log(`  Team H2H: ${team1} vs ${team2}`);
        }
      });
    } else {
      console.log('\nNo races with head-to-head data found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Close MongoDB connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('Disconnected from MongoDB');
    }
  }
};

// Run the function
listRaces();

// Usage: node scripts/listRaces.js