// C:\Users\clint\f1-tipping-site\backend\utils\headToHeadProcessor.js

/**
 * Process head-to-head predictions for a race
 * @param {Object} predictions - User predictions
 * @param {Object} raceResults - Actual race results
 * @param {Object} pointSystem - Point system configuration
 * @returns {Object} Processed head-to-head results with scores
 */
const processHeadToHead = (predictions, raceResults, pointSystem) => {
  if (!predictions || !raceResults) {
    return {
      driverHeadToHead: { correct: false, points: 0 },
      teamHeadToHead: { correct: false, points: 0 },
      headToHead: {
        drivers: { winner: null },
        teams: { winner: null }
      }
    };
  }
  
  // Initialize results object with the structure your UI expects
  const results = {
    driverHeadToHead: { correct: false, points: 0 },
    teamHeadToHead: { correct: false, points: 0 },
    headToHead: {
      drivers: { winner: raceResults.headToHead?.drivers?.winner || null },
      teams: { winner: raceResults.headToHead?.teams?.winner || null }
    }
  };

  // Process driver head-to-head
  if (
    predictions.driverHeadToHead &&
    predictions.driverHeadToHead.winner &&
    raceResults.headToHead &&
    raceResults.headToHead.drivers
  ) {
    const userPick = predictions.driverHeadToHead.winner;
    const actualWinner = raceResults.headToHead.drivers.winner;
    
    results.driverHeadToHead.correct = userPick === actualWinner;
    
    if (results.driverHeadToHead.correct) {
      results.driverHeadToHead.points = pointSystem.headToHead.driver || 3;
    }
  }

  // Process team head-to-head
  if (
    predictions.teamHeadToHead &&
    predictions.teamHeadToHead.winner &&
    raceResults.headToHead &&
    raceResults.headToHead.teams
  ) {
    const userPick = predictions.teamHeadToHead.winner;
    const actualWinner = raceResults.headToHead.teams.winner;
    
    results.teamHeadToHead.correct = userPick === actualWinner;
    
    if (results.teamHeadToHead.correct) {
      results.teamHeadToHead.points = pointSystem.headToHead.team || 3;
    }
  }

  return results;
};
  
  module.exports = { processHeadToHead };