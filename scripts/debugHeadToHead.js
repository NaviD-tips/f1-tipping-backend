// C:\Users\clint\f1-tipping-site\backend\scripts\debugHeadToHead.js

require('dotenv').config();
const mongoose = require('mongoose');
const Race = require('../models/Race');
const Result = require('../models/Result');
const { processRaceResults } = require('../services/resultsService');

const debugHeadToHead = async (raceId) => {
  try {
    // Connect to MongoDB
    console.log(`Connecting to MongoDB...`);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Fetch race data
    console.log(`Fetching race with ID: ${raceId}`);
    const race = await Race.findById(raceId);
    if (!race) {
      console.error('Race not found');
      return;
    }
    
    console.log(`\nRace found: ${race.raceName} (${race.season} Round ${race.round})`);
    console.log('Head-to-head configuration:');
    console.log(JSON.stringify(race.headToHead, null, 2) || 'No head-to-head configuration found');
    
    // Fetch result data
    console.log(`\nFetching result for race ID: ${raceId}`);
    const result = await Result.findOne({ race: raceId });
    if (!result) {
      console.error('No result found for this race');
      return;
    }
    
    console.log('Result found, head-to-head data:');
    console.log(JSON.stringify(result.headToHead, null, 2) || 'No head-to-head data in result');
    
    // Check if head-to-head data exists in both race and result
    if (!race.headToHead) {
      console.error('\nERROR: Race does not have head-to-head configuration');
    }
    
    if (!result.headToHead) {
      console.error('\nERROR: Result does not have head-to-head data');
    }
    
    // Format data like the frontend expects
    const frontendFormat = {
      configuration: {
        drivers: race.headToHead?.drivers || null,
        teams: race.headToHead?.teams || null
      },
      results: {
        drivers: result?.headToHead?.drivers || null,
        teams: result?.headToHead?.teams || null
      }
    };
    
    console.log('\nData in frontend format:');
    console.log(JSON.stringify(frontendFormat, null, 2));
    
    // Check if there's driver head-to-head
    if (frontendFormat.configuration.drivers) {
      console.log('\nDriver head-to-head found in configuration:');
      console.log(`Driver 1: ${frontendFormat.configuration.drivers.driver1?.name || 'Not set'}`);
      console.log(`Driver 2: ${frontendFormat.configuration.drivers.driver2?.name || 'Not set'}`);
      
      if (frontendFormat.results.drivers) {
        console.log(`Winner: ${frontendFormat.results.drivers.winner || 'No winner (tie or results pending)'}`);
      } else {
        console.error('ERROR: Driver head-to-head configuration exists but no results data');
      }
    }
    
    // Check if there's team head-to-head
    if (frontendFormat.configuration.teams) {
      console.log('\nTeam head-to-head found in configuration:');
      console.log(`Team 1: ${frontendFormat.configuration.teams.team1?.name || 'Not set'}`);
      console.log(`Team 2: ${frontendFormat.configuration.teams.team2?.name || 'Not set'}`);
      
      if (frontendFormat.results.teams) {
        console.log(`Winner: ${frontendFormat.results.teams.winner || 'No winner (tie or results pending)'}`);
      } else {
        console.error('ERROR: Team head-to-head configuration exists but no results data');
      }
    }
    
    console.log('\nDebugging complete!');
    
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

// Check if a race ID was provided as a command line argument
const raceId = process.argv[2];
if (!raceId) {
  console.error('Please provide a race ID as a command line argument');
  process.exit(1);
}

// Run the debug function
debugHeadToHead(raceId);

// Usage: node scripts/debugHeadToHead.js <raceId>