// C:\Users\clint\f1-tipping-site\backend\scripts\updateRaceStatus.js

const mongoose = require('mongoose');
const Race = require('../models/Race');
const Result = require('../models/Result');

/**
 * Determine head-to-head winners and update race results
 * @param {string} raceId - MongoDB ID of the race to update
 */
const updateHeadToHeadResults = async (raceId) => {
  try {
    // Connect to database if not already connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
    
    // Fetch race data with head-to-head matchups
    const race = await Race.findById(raceId);
    if (!race) {
      throw new Error(`Race with ID ${raceId} not found`);
    }
    
    // Fetch race results
    const result = await Result.findOne({ race: raceId });
    if (!result) {
      throw new Error(`No results found for race with ID ${raceId}`);
    }
    
    // Initialize head-to-head results structure if it doesn't exist
    if (!result.headToHead) {
      result.headToHead = {
        drivers: { winner: null },
        teams: { winner: null }
      };
    }
    
    // Process driver head-to-head if configured
    if (race.headToHead?.drivers?.driver1 && race.headToHead?.drivers?.driver2) {
      const driver1Id = race.headToHead.drivers.driver1.driverId;
      const driver2Id = race.headToHead.drivers.driver2.driverId;
      
      // Find positions of both drivers
      const driver1Position = findDriverPosition(result.results, driver1Id);
      const driver2Position = findDriverPosition(result.results, driver2Id);
      
      // Determine winner (lower position number is better)
      if (driver1Position && driver2Position) {
        if (driver1Position < driver2Position) {
          result.headToHead.drivers.winner = driver1Id;
        } else if (driver2Position < driver1Position) {
          result.headToHead.drivers.winner = driver2Id;
        }
        // If equal or both drivers DNF with same position, it's a tie (winner remains null)
      } else if (driver1Position) {
        // Driver 2 DNF and Driver 1 finished
        result.headToHead.drivers.winner = driver1Id;
      } else if (driver2Position) {
        // Driver 1 DNF and Driver 2 finished
        result.headToHead.drivers.winner = driver2Id;
      }
      // If both drivers DNF with no position, it's a tie (winner remains null)
    }
    
    // Process team head-to-head if configured
    if (race.headToHead?.teams?.team1 && race.headToHead?.teams?.team2) {
      const team1Id = race.headToHead.teams.team1.constructorId;
      const team2Id = race.headToHead.teams.team2.constructorId;
      
      // Calculate team performances based on their best driver's position
      const team1BestPosition = findTeamBestPosition(result.results, team1Id);
      const team2BestPosition = findTeamBestPosition(result.results, team2Id);
      
      // Determine winner (lower position number is better)
      if (team1BestPosition && team2BestPosition) {
        if (team1BestPosition < team2BestPosition) {
          result.headToHead.teams.winner = team1Id;
        } else if (team2BestPosition < team1BestPosition) {
          result.headToHead.teams.winner = team2Id;
        }
        // If equal, it's a tie (winner remains null)
      } else if (team1BestPosition) {
        // Team 2 had no finishers
        result.headToHead.teams.winner = team1Id;
      } else if (team2BestPosition) {
        // Team 1 had no finishers
        result.headToHead.teams.winner = team2Id;
      }
      // If both teams had no finishers, it's a tie (winner remains null)
    }
    
    // Save updated result
    await result.save();
    
    console.log(`Updated head-to-head results for race: ${race.raceName}`);
    return result;
    
  } catch (error) {
    console.error('Error updating head-to-head results:', error.message);
    throw error;
  }
};

/**
 * Find driver's position in race results
 * @param {Array} results - Race results array
 * @param {string} driverId - Driver ID to find
 * @returns {number|null} Position (1-indexed) or null if DNF/DNS
 */
const findDriverPosition = (results, driverId) => {
  const driverResult = results.find(r => r.driverId === driverId);
  
  if (!driverResult) return null;
  
  // Return position only if driver has a valid finishing position
  return driverResult.position && (driverResult.status === 'Finished' || driverResult.status === 'Lapped') 
    ? parseInt(driverResult.position) 
    : null;
};

/**
 * Find team's best position in race results
 * @param {Array} results - Race results array
 * @param {string} teamId - Team/constructor ID
 * @returns {number|null} Best position (1-indexed) or null if no drivers finished
 */
const findTeamBestPosition = (results, teamId) => {
  // Filter for this team's drivers who finished
  const teamResults = results
    .filter(r => r.constructorId === teamId && r.status === 'Finished')
    .map(r => parseInt(r.position))
    .sort((a, b) => a - b); // Sort numerically
  
  // Return best position or null if no drivers finished
  return teamResults.length > 0 ? teamResults[0] : null;
};

module.exports = { updateHeadToHeadResults };