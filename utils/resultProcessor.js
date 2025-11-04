// C:\Users\clint\f1-tipping-site\backend\utils\resultProcessor.js
const axios = require('axios');
const mongoose = require('mongoose');
const Race = require('../models/Race');
const Prediction = require('../models/Prediction');
const User = require('../models/User');

/**
 * Fetches results for a completed race and processes predictions
 * @param {string} season - Season year
 * @param {string} round - Race round number
 */
async function processRaceResults(season, round) {
  try {
    console.log(`Processing results for ${season} round ${round}`);
    
    // Fetch race results from Ergast API
    const resultsResponse = await axios.get(
      `http://ergast.com/api/f1/${season}/${round}/results.json`
    );
    
    const raceData = resultsResponse.data.MRData.RaceTable.Races[0];
    if (!raceData) {
      console.log('No race data found');
      return;
    }
    
    // Find race in our database
    const race = await Race.findOne({ season, round });
    if (!race) {
      console.log('Race not found in database');
      return;
    }
    
    // Process race results (simplified for now)
    console.log(`Processing results for ${race.raceName}`);
    
    // Mark as processed (we'll implement full scoring later)
    race.resultsProcessed = true;
    await race.save();
    
    return true;
  } catch (error) {
    console.error('Error processing race results:', error);
    return false;
  }
}

/**
 * Check for and process any new race results
 */
async function checkForNewResults() {
  try {
    const now = new Date();
    
    // Find races that have occurred but haven't been processed
    const pendingRaces = await Race.find({
      date: { $lt: now },
      resultsProcessed: false
    }).sort({ date: 1 });
    
    console.log(`Found ${pendingRaces.length} races to process`);
    
    for (const race of pendingRaces) {
      // Only process results if race was at least 3 hours ago
      const raceTime = new Date(race.date);
      const hoursSinceRace = (now - raceTime) / (1000 * 60 * 60);
      
      if (hoursSinceRace >= 3) {
        await processRaceResults(race.season, race.round);
      } else {
        console.log(`Race ${race.raceName} occurred less than 3 hours ago, skipping for now`);
      }
    }
  } catch (error) {
    console.error('Error checking for new results:', error);
  }
}

module.exports = {
  processRaceResults,
  checkForNewResults
};