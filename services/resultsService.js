// C:\Users\clint\f1-tipping-site\backend\services\ResultsService.js

const mongoose = require('mongoose');
const Race = require('../models/Race');
const Result = require('../models/Result');
const ergastService = require('../services/ergastService');

/**
 * Find driver's position in race results
 * @param {Array} results - Race results array
 * @param {string} driverId - Driver ID to find
 * @returns {number|null} Position (1-indexed) or null if DNF/DNS
 */
const findDriverPosition = (results, driverId) => {
  const driverResult = results.find(r => r.driverId === driverId);
  
  if (!driverResult) return null;
  
  // Return position if driver has a valid finishing position (including lapped)
  return driverResult.position && (driverResult.status === 'Finished' || driverResult.status === 'Lapped') 
    ? parseInt(driverResult.position) 
    : null;
};

/**
 * Find team's average position using actual race positions only
 */
const findTeamAveragePosition = (results, teamId) => {
  console.log(`\n--- Finding average position for team: ${teamId} ---`);
  
  if (!results || results.length === 0) {
    console.log('No results array provided or empty');
    return null;
  }
  
  // Filter for this team's drivers and get their positions
  const teamResults = results.filter(r => r.constructorId === teamId);
  console.log(`Found ${teamResults.length} drivers for team ${teamId}`);
  
  if (teamResults.length === 0) {
    console.log(`No results found for team: ${teamId}`);
    console.log('Available constructor IDs:', [...new Set(results.map(r => r.constructorId))]);
    return null;
  }
  
  // Debug each driver result
  teamResults.forEach((result, index) => {
    console.log(`Driver ${index + 1}: ${result.driverId} - Position: ${result.position}, Status: ${result.status}`);
  });
  
  // Get actual race positions for all drivers (regardless of status)
  const positions = [];
  
  teamResults.forEach(result => {
    // Use actual race position if it exists
    if (result.position) {
      const pos = parseInt(result.position);
      console.log(`Adding actual position: ${pos} (Status: ${result.status})`);
      positions.push(pos);
    } else {
      console.log(`No position found for ${result.driverId} - skipping`);
    }
  });
  
  if (positions.length === 0) {
    console.log('No valid positions found');
    return null;
  }
  
  // Calculate average position
  const average = positions.reduce((sum, pos) => sum + pos, 0) / positions.length;
  const roundedAverage = Math.round(average * 100) / 100;
  console.log(`Positions: ${positions}, Average: ${roundedAverage}`);
  console.log(`--- End team ${teamId} calculation ---\n`);
  
  return roundedAverage;
};

/**
 * Processes race results and determines head-to-head winners
 * @param {string} raceId - MongoDB ID of the race
 * @returns {Object} Updated race result with head-to-head info
 */
const processAndSaveResults = async (raceId) => {
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
    
    // Debug race data
    console.log('Race data found:', {
      id: race._id,
      name: race.raceName,
      season: race.season,
      round: race.round
    });
    
    // Fetch race results
    let result = await Result.findOne({ race: raceId });
    
    if (!result) {
      console.log('No existing result found, creating new result document');
      
      // Get race results from Ergast API
      console.log(`Fetching race results for ${race.season} round ${race.round}`);
      const raceResults = await ergastService.fetchRaceResults(race.season, race.round);
      
      if (!raceResults) {
        console.log('No results returned from Ergast API, creating empty result');
        // Create a new result document with empty fields
        const newResult = {
          race: raceId,
          season: race.season,
          round: race.round,
          polePosition: '',
          podium: [],
          fastestLap: '',
          firstRetirement: '',
          results: [],
          headToHead: {
            drivers: {
              driver1: race.headToHead?.drivers?.driver1 || null,
              driver2: race.headToHead?.drivers?.driver2 || null,
              winner: null
            },
            teams: {
              team1: race.headToHead?.teams?.team1 || null,
              team2: race.headToHead?.teams?.team2 || null,
              winner: null
            }
          }
        };
        result = new Result(newResult);
      } else {
        console.log(`Found race results with ${raceResults.results.length} driver results`);
        
        // Create a new result document with API data
        const newResult = {
          race: raceId,
          season: race.season,
          round: race.round,
          polePosition: raceResults.polePosition || '',
          podium: raceResults.podium || [],
          fastestLap: raceResults.fastestLap || '',
          firstRetirement: raceResults.firstRetirement || '',
          results: raceResults.results || [],
          headToHead: {
            drivers: {
              driver1: race.headToHead?.drivers?.driver1 || null,
              driver2: race.headToHead?.drivers?.driver2 || null,
              winner: null
            },
            teams: {
              team1: race.headToHead?.teams?.team1 || null,
              team2: race.headToHead?.teams?.team2 || null,
              winner: null
            }
          }
        };
        result = new Result(newResult);
      }
    } else {
      console.log(`Existing result found for race ID ${raceId}`);
      
      // Check if we need to update race results
      if (!result.results || result.results.length === 0) {
        console.log('Existing result has no driver results, trying to fetch from API');
        const raceResults = await ergastService.fetchRaceResults(race.season, race.round);
        
        if (raceResults) {
          console.log(`Updating with ${raceResults.results.length} driver results from API`);
          result.polePosition = raceResults.polePosition || result.polePosition;
          result.podium = raceResults.podium || result.podium;
          result.fastestLap = raceResults.fastestLap || result.fastestLap;
          result.firstRetirement = raceResults.firstRetirement || result.firstRetirement;
          result.results = raceResults.results;
        }
      }
    }
    
    // Process driver head-to-head
    await processDriverHeadToHead(race, result);
    
    // Process team head-to-head
    await processTeamHeadToHead(race, result);
    
    // Before saving, verify required fields are set
    if (!result.season) result.season = race.season;
    if (!result.round) result.round = race.round;
    
    console.log('Result before saving:', {
      race: result.race,
      season: result.season, 
      round: result.round,
      resultsCount: result.results?.length || 0
    });
    
    // Save updated result
    await result.save();
    
    console.log(`Updated race results for ${race.raceName} with ${result.results?.length || 0} driver results`);
    return result;
    
  } catch (error) {
    console.error('Error processing results:', error);
    throw error;
  }
};

/**
 * Process driver head-to-head matchup
 * @param {Object} race - Race document
 * @param {Object} result - Result document to update
 */
const processDriverHeadToHead = async (race, result) => {
  if (!race.headToHead?.drivers?.driver1 || !race.headToHead?.drivers?.driver2) {
    console.log('No driver head-to-head configured for this race');
    return;
  }
  
  // Initialize head-to-head results structure if it doesn't exist
  if (!result.headToHead) {
    result.headToHead = {};
  }

  // Always rebuild drivers to ensure complete structure
  const getDriverInfo = (driverId) => {
    const driverResult = result.results.find(r => r.driverId === driverId);
    return driverResult ? {
      driverId: driverResult.driverId,
      code: driverResult.code,
      name: `${driverResult.givenName} ${driverResult.familyName}`
    } : {
      driverId: driverId,
      code: null,
      name: null
    };
  };

  // Store existing winner before rebuilding
  const existingWinner = result.headToHead.drivers?.winner;

  result.headToHead.drivers = { 
    driver1: getDriverInfo(race.headToHead.drivers.driver1.driverId || race.headToHead.drivers.driver1),
    driver2: getDriverInfo(race.headToHead.drivers.driver2.driverId || race.headToHead.drivers.driver2),
    winner: existingWinner || null
  };

  const driver1Id = race.headToHead.drivers.driver1.driverId;
  const driver2Id = race.headToHead.drivers.driver2.driverId;
  
  // Find positions of both drivers in race results
  const driver1Position = findDriverPosition(result.results, driver1Id);
  const driver2Position = findDriverPosition(result.results, driver2Id);
  
  console.log(`Driver head-to-head: ${driver1Id} (P${driver1Position || 'DNF'}) vs ${driver2Id} (P${driver2Position || 'DNF'})`);
  
  // If both drivers have valid positions, determine winner by lower position
  if (driver1Position && driver2Position) {
    if (driver1Position < driver2Position) {
      result.headToHead.drivers.winner = driver1Id;
    } else if (driver2Position < driver1Position) {
      result.headToHead.drivers.winner = driver2Id;
    }
    // If equal positions, it's a tie (winner remains null)
  }
  // If only one driver has a valid position (finished the race), they're the winner
  else if (driver1Position) {
    result.headToHead.drivers.winner = driver1Id;
  } else if (driver2Position) {
    result.headToHead.drivers.winner = driver2Id;
  }
  // If neither driver has a position (both DNF), it's a tie (winner remains null)
  
  console.log(`Driver head-to-head winner: ${result.headToHead.drivers.winner || 'Tie (null)'}`);
};

const processTeamHeadToHead = async (race, result) => {
  console.log('=== TEAM HEAD-TO-HEAD DEBUG START ===');
  
  if (!race.headToHead?.teams?.team1 || !race.headToHead?.teams?.team2) {
    console.log('No team head-to-head configured for this race');
    return;
  }
  
  // Initialize head-to-head results structure if it doesn't exist
  if (!result.headToHead) {
    result.headToHead = {};
  }

  // Always rebuild teams to ensure complete structure
  const getTeamInfo = (teamId) => {
    const teamResult = result.results.find(r => r.constructorId === teamId);
    return teamResult ? {
      constructorId: teamResult.constructorId,
      name: teamResult.constructorName
    } : {
      constructorId: teamId,
      name: null
    };
  };

  // Store existing winner before rebuilding
  const existingWinner = result.headToHead.teams?.winner;

  result.headToHead.teams = { 
    team1: getTeamInfo(race.headToHead.teams.team1.constructorId || race.headToHead.teams.team1),
    team2: getTeamInfo(race.headToHead.teams.team2.constructorId || race.headToHead.teams.team2),
    winner: existingWinner || null
  };
  
  const team1Id = race.headToHead.teams.team1.constructorId;
  const team2Id = race.headToHead.teams.team2.constructorId;
  
  console.log('Looking for teams with IDs:', { team1Id, team2Id });
  
  // Debug: Show ALL result data structure
  console.log('Total results count:', result.results?.length || 0);
  console.log('Sample result structure:', result.results?.[0] || 'No results');
  
  // Debug: Show all unique constructor IDs in results
  const allConstructorIds = [...new Set(result.results?.map(r => r.constructorId) || [])];
  console.log('All constructor IDs in results:', allConstructorIds);
  
  // Calculate team performance based on average position of both drivers
  const team1AvgPosition = findTeamAveragePosition(result.results, team1Id);
  const team2AvgPosition = findTeamAveragePosition(result.results, team2Id);
  
  console.log(`Team head-to-head: ${team1Id} (Avg: ${team1AvgPosition || 'N/A'}) vs ${team2Id} (Avg: ${team2AvgPosition || 'N/A'})`);
  
  // Debug: Show individual driver results for troubleshooting
  const team1Results = result.results?.filter(r => r.constructorId === team1Id) || [];
  const team2Results = result.results?.filter(r => r.constructorId === team2Id) || [];
  console.log(`${team1Id} drivers:`, team1Results.map(r => `${r.driverId}: P${r.position} (${r.status})`));
  console.log(`${team2Id} drivers:`, team2Results.map(r => `${r.driverId}: P${r.position} (${r.status})`));
  
  // If both teams have valid average positions, determine winner by lower average
  if (team1AvgPosition !== null && team2AvgPosition !== null) {
    if (team1AvgPosition < team2AvgPosition) {
      result.headToHead.teams.winner = team1Id;
    } else if (team2AvgPosition < team1AvgPosition) {
      result.headToHead.teams.winner = team2Id;
    }
    // If equal averages, it's a tie (winner remains null)
  }
  // If only one team has a valid average, they're the winner
  else if (team1AvgPosition !== null) {
    result.headToHead.teams.winner = team1Id;
  } else if (team2AvgPosition !== null) {
    result.headToHead.teams.winner = team2Id;
  }
  // If neither team has a valid average, it's a tie (winner remains null)
  
  console.log(`Team head-to-head winner: ${result.headToHead.teams.winner || 'Tie (null)'}`);
  console.log('Final headToHead teams object:', JSON.stringify(result.headToHead.teams, null, 2));
  console.log('=== TEAM HEAD-TO-HEAD DEBUG END ===');
};

module.exports = {
  processAndSaveResults
};