// C:\Users\clint\f1-tipping-site\backend\scripts\checkRaceIds.js

require('dotenv').config();
const mongoose = require('mongoose');
const Race = require('../models/Race');
const Result = require('../models/Result');
const Prediction = require('../models/Prediction');

const checkRaceIds = async () => {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Fetch all races
    console.log('Fetching all races...');
    const races = await Race.find().sort({ season: -1, round: 1 });
    console.log(`Found ${races.length} races`);
    
    // Check for duplicate race names, seasons, and rounds
    const raceMap = new Map();
    const duplicates = [];
    
    races.forEach(race => {
      const key = `${race.season}-${race.round}-${race.raceName}`;
      if (raceMap.has(key)) {
        duplicates.push({
          key,
          races: [raceMap.get(key), race]
        });
      } else {
        raceMap.set(key, race);
      }
    });
    
    if (duplicates.length > 0) {
      console.log('\n⚠️ WARNING: Found duplicate races:');
      duplicates.forEach(dup => {
        console.log(`\nDuplicate: ${dup.key}`);
        dup.races.forEach(race => {
          console.log(`  ID: ${race._id}, Created: ${race.createdAt}, Updated: ${race.updatedAt}`);
        });
      });
    } else {
      console.log('\n✅ No duplicate races found');
    }
    
    // Find races with head-to-head configurations
    const racesWithH2H = races.filter(race => race.headToHead);
    console.log(`\nFound ${racesWithH2H.length} races with head-to-head configurations`);
    
    // Check for each race
    for (const race of races) {
      console.log(`\n=== Race: ${race.raceName} (${race.season} Round ${race.round}) ===`);
      console.log(`ID: ${race._id}`);
      
      // Check if race has head-to-head configuration
      if (race.headToHead) {
        console.log('Has head-to-head configuration:');
        const driversConfigured = race.headToHead.drivers && 
                                 race.headToHead.drivers.driver1 && 
                                 race.headToHead.drivers.driver1.driverId &&
                                 race.headToHead.drivers.driver2 && 
                                 race.headToHead.drivers.driver2.driverId;
                                 
        const teamsConfigured = race.headToHead.teams && 
                               race.headToHead.teams.team1 && 
                               race.headToHead.teams.team1.constructorId &&
                               race.headToHead.teams.team2 && 
                               race.headToHead.teams.team2.constructorId;
                               
        if (driversConfigured) {
          console.log(`  Drivers: ${race.headToHead.drivers.driver1.name} vs ${race.headToHead.drivers.driver2.name}`);
        } else {
          console.log('  ❌ Drivers not fully configured');
        }
        
        if (teamsConfigured) {
          console.log(`  Teams: ${race.headToHead.teams.team1.name} vs ${race.headToHead.teams.team2.name}`);
        } else {
          console.log('  ❌ Teams not fully configured');
        }
      } else {
        console.log('❌ No head-to-head configuration');
      }
      
      // Check for results
      const result = await Result.findOne({ race: race._id });
      if (result) {
        console.log('Has results:');
        console.log(`  Result ID: ${result._id}`);
        
        if (result.headToHead) {
          if (result.headToHead.drivers) {
            console.log(`  Driver H2H winner: ${result.headToHead.drivers.winner || 'Not set'}`);
          }
          
          if (result.headToHead.teams) {
            console.log(`  Team H2H winner: ${result.headToHead.teams.winner || 'Not set'}`);
          }
        } else {
          console.log('  ❌ No head-to-head in results');
        }
      } else {
        console.log('❌ No results found');
      }
      
      // Check for predictions
      const predictionCount = await Prediction.countDocuments({ raceId: race._id });
      console.log(`Predictions: ${predictionCount}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('\nDisconnected from MongoDB');
  }
};

// Run the function
checkRaceIds();

// Usage: node scripts/checkRaceIds.js