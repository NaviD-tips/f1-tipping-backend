// C:\Users\clint\f1-tipping-site\backend\scripts\reprocessResults.js
require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');  // This needs to come before using mongoose

// Now you can use mongoose
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/f1tipping')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

const Race = require('../models/Race');
const { processAndSaveResults } = require('../services/resultsService');

async function reprocessAllResults() {
  try {
    // Get all completed races
    const completedRaces = await Race.find({ status: 'completed' });
    console.log(`Found ${completedRaces.length} completed races to reprocess`);
    
    for (const race of completedRaces) {
      console.log(`Reprocessing results for ${race.raceName}`);
      
      // Delete existing result
      await mongoose.model('Result').deleteOne({ race: race._id });
      
      // Reprocess
      await processAndSaveResults(race._id);
    }
    
    console.log('All races reprocessed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error reprocessing results:', error);
    process.exit(1);
  }
}

async function reprocessAllResults() {
    try {
      // Get all races (without status filter)
      const allRaces = await Race.find({});
      console.log(`Found ${allRaces.length} total races`);
      
      // Log each race's status to debug
      allRaces.forEach(race => {
        console.log(`Race: ${race.raceName}, Status: ${race.status || 'undefined'}`);
      });
      
      // Filter for races that have results (which should be completed)
      const racesWithResults = await mongoose.model('Result').distinct('race');
      console.log(`Found ${racesWithResults.length} races with results`);
      
      if (racesWithResults.length === 0) {
        console.log('No races with results found. Nothing to reprocess.');
        process.exit(0);
      }
      
      // Process each race that has results
      for (const raceId of racesWithResults) {
        const race = await Race.findById(raceId);
        if (!race) {
          console.log(`Race with ID ${raceId} not found`);
          continue;
        }
        
        console.log(`Reprocessing results for ${race.raceName}`);
        
        // Delete existing result
        await mongoose.model('Result').deleteOne({ race: raceId });
        
        // Reprocess
        await processAndSaveResults(raceId);
      }
      
      console.log('All races reprocessed successfully');
      process.exit(0);
    } catch (error) {
      console.error('Error reprocessing results:', error);
      process.exit(1);
    }
  }
  
  reprocessAllResults();