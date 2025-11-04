const Prediction = require('../models/Prediction');
const Result = require('../models/Result');
const User = require('../models/User');

// Point values for different prediction types
const POINTS = {
  POLE_POSITION: 2,    // Pole position (2 points)
  WINNER: 6,           // Race winner/P1 (6 points)
  SECOND_PLACE: 4,     // Race 2nd (4 points)
  THIRD_PLACE: 2,      // Race 3rd (2 points)
  FASTEST_LAP: 1,      // Fastest lap (1 point)
  FIRST_RETIREMENT: 1, // First retirement (1 point)
  DRIVER_H2H: 1,       // Driver head to head (1 point)
  TEAM_H2H: 1,         // Team head to head (1 point)
  PODIUM_DRIVER: 1,    // Driver predicted for podium is in actual podium (1 point)
  ALL_PODIUM_CORRECT_ORDER: 6,  // All 3 podium drivers in correct positions (6 bonus points)
  ALL_PODIUM_WRONG_ORDER: 2     // All 3 podium drivers but wrong positions (2 bonus points)
};

/**
 * Calculate score for a single prediction with enhanced head-to-head support
 * @param {Object} prediction - User prediction document
 * @param {Object} result - Race result document
 * @returns {Object} Calculated score and breakdown
 */
async function calculateScore(prediction, result) {
  console.log("======= SCORE CALCULATION START =======");
  console.log(`Calculating score for user ${prediction.user.username} for race ID ${result.race}`);
  
  let scoreValue = 0;
  let breakdown = [];
  
  // Track which drivers were correctly predicted for exact podium positions
  const exactPodiumMatches = new Set();
  let exactPodiumCount = 0;
  
  // Pole position (2 points)
  if (prediction.predictions.polePosition === result.polePosition) {
    scoreValue += POINTS.POLE_POSITION;
    console.log(`✓ Pole position correct: +${POINTS.POLE_POSITION} points`);
    breakdown.push({
      type: 'POLE_POSITION',
      points: POINTS.POLE_POSITION,
      driver: prediction.predictions.polePosition
    });
  } else {
    console.log(`✗ Pole position incorrect. Predicted: ${prediction.predictions.polePosition}, Actual: ${result.polePosition}`);
  }
  
  // Race winner/P1 (6 points)
  if (prediction.predictions.podium[0] === result.podium[0]) {
    scoreValue += POINTS.WINNER;
    console.log(`✓ Race winner correct: +${POINTS.WINNER} points`);
    breakdown.push({
      type: 'WINNER',
      points: POINTS.WINNER,
      driver: prediction.predictions.podium[0]
    });
    exactPodiumMatches.add(prediction.predictions.podium[0]);
    exactPodiumCount++;
  } else {
    console.log(`✗ Race winner incorrect. Predicted: ${prediction.predictions.podium[0]}, Actual: ${result.podium[0]}`);
  }
  
  // P2 (4 points)
  if (prediction.predictions.podium[1] === result.podium[1]) {
    scoreValue += POINTS.SECOND_PLACE;
    console.log(`✓ P2 correct: +${POINTS.SECOND_PLACE} points`);
    breakdown.push({
      type: 'SECOND_PLACE',
      points: POINTS.SECOND_PLACE,
      driver: prediction.predictions.podium[1]
    });
    exactPodiumMatches.add(prediction.predictions.podium[1]);
    exactPodiumCount++;
  } else {
    console.log(`✗ P2 incorrect. Predicted: ${prediction.predictions.podium[1]}, Actual: ${result.podium[1]}`);
  }
  
  // P3 (2 points)
  if (prediction.predictions.podium[2] === result.podium[2]) {
    scoreValue += POINTS.THIRD_PLACE;
    console.log(`✓ P3 correct: +${POINTS.THIRD_PLACE} points`);
    breakdown.push({
      type: 'THIRD_PLACE',
      points: POINTS.THIRD_PLACE,
      driver: prediction.predictions.podium[2]
    });
    exactPodiumMatches.add(prediction.predictions.podium[2]);
    exactPodiumCount++;
  } else {
    console.log(`✗ P3 incorrect. Predicted: ${prediction.predictions.podium[2]}, Actual: ${result.podium[2]}`);
  }
  
  // Check for drivers correctly predicted to be on podium but in wrong position (1 point each)
  for (let i = 0; i < 3; i++) {
    const predictedDriver = prediction.predictions.podium[i];
    
    // Skip if this driver was already awarded points for exact position match
    if (exactPodiumMatches.has(predictedDriver)) continue;
    
    // Check if driver is in the actual podium (but different position)
    if (result.podium.includes(predictedDriver)) {
      scoreValue += POINTS.PODIUM_DRIVER;
      console.log(`✓ Driver ${predictedDriver} correctly predicted for podium but wrong position: +${POINTS.PODIUM_DRIVER} point`);
      breakdown.push({
        type: 'PODIUM_DRIVER',
        points: POINTS.PODIUM_DRIVER,
        driver: predictedDriver
      });
    }
  }
  
  // **NEW: Check for podium bonus points**
  // Check if all 3 predicted drivers are in the actual podium
  const predictedPodiumSet = new Set(prediction.predictions.podium);
  const actualPodiumSet = new Set(result.podium);
  
  // Check if all predicted drivers are in actual podium
  const allPredictedInActual = prediction.predictions.podium.every(driver => 
    result.podium.includes(driver)
  );
  
  if (allPredictedInActual && prediction.predictions.podium.length === 3) {
    if (exactPodiumCount === 3) {
      // All 3 drivers in correct positions - 6 bonus points
      scoreValue += POINTS.ALL_PODIUM_CORRECT_ORDER;
      console.log(`🎯 BONUS: All 3 podium drivers in correct positions: +${POINTS.ALL_PODIUM_CORRECT_ORDER} bonus points`);
      breakdown.push({
        type: 'ALL_PODIUM_CORRECT_ORDER',
        points: POINTS.ALL_PODIUM_CORRECT_ORDER,
        driver: 'All podium correct'
      });
    } else {
      // All 3 drivers correct but not all in right positions - 2 bonus points
      scoreValue += POINTS.ALL_PODIUM_WRONG_ORDER;
      console.log(`🎯 BONUS: All 3 podium drivers correct but wrong order: +${POINTS.ALL_PODIUM_WRONG_ORDER} bonus points`);
      breakdown.push({
        type: 'ALL_PODIUM_WRONG_ORDER',
        points: POINTS.ALL_PODIUM_WRONG_ORDER,
        driver: 'All podium wrong order'
      });
    }
  }
  
  // Fastest lap (1 point)
  if (prediction.predictions.fastestLap === result.fastestLap) {
    scoreValue += POINTS.FASTEST_LAP;
    console.log(`✓ Fastest lap correct: +${POINTS.FASTEST_LAP} points`);
    breakdown.push({
      type: 'FASTEST_LAP',
      points: POINTS.FASTEST_LAP,
      driver: prediction.predictions.fastestLap
    });
  } else {
    console.log(`✗ Fastest lap incorrect. Predicted: ${prediction.predictions.fastestLap}, Actual: ${result.fastestLap}`);
  }
  
  // First retirement (1 point)
  if (prediction.predictions.firstRetirement === result.firstRetirement) {
    scoreValue += POINTS.FIRST_RETIREMENT;
    console.log(`✓ First retirement correct: +${POINTS.FIRST_RETIREMENT} points`);
    breakdown.push({
      type: 'FIRST_RETIREMENT',
      points: POINTS.FIRST_RETIREMENT,
      driver: prediction.predictions.firstRetirement
    });
  } else {
    console.log(`✗ First retirement incorrect. Predicted: ${prediction.predictions.firstRetirement}, Actual: ${result.firstRetirement}`);
  }
  
  // Driver head-to-head (1 point)
  if (prediction.predictions.driverHeadToHead && 
      prediction.predictions.driverHeadToHead.winner && 
      result.headToHead && 
      result.headToHead.drivers && 
      result.headToHead.drivers.winner) {
    
    // Compare the predicted winner to the actual winner
    if (prediction.predictions.driverHeadToHead.winner === result.headToHead.drivers.winner) {
      scoreValue += POINTS.DRIVER_H2H;
      console.log(`✓ Driver head-to-head correct: +${POINTS.DRIVER_H2H} points`);
      
      breakdown.push({
        type: 'DRIVER_H2H',
        points: POINTS.DRIVER_H2H,
        driver: prediction.predictions.driverHeadToHead.winner
      });
    } else {
      console.log(`✗ Driver head-to-head incorrect. Predicted: ${prediction.predictions.driverHeadToHead.winner}, Actual: ${result.headToHead.drivers.winner}`);
    }
  } else if (result.headToHead && result.headToHead.drivers && !result.headToHead.drivers.winner) {
    // If there was a tie (no winner)
    console.log(`- Driver head-to-head was a tie, no points awarded`);
  } else if (prediction.predictions.driverHeadToHead && prediction.predictions.driverHeadToHead.winner) {
    console.log(`- Driver head-to-head result not available`);
  }
  
  // Team head-to-head (1 point)
  if (prediction.predictions.teamHeadToHead && 
      prediction.predictions.teamHeadToHead.winner && 
      result.headToHead && 
      result.headToHead.teams && 
      result.headToHead.teams.winner) {
    
    // Compare the predicted winner to the actual winner
    if (prediction.predictions.teamHeadToHead.winner === result.headToHead.teams.winner) {
      scoreValue += POINTS.TEAM_H2H;
      console.log(`✓ Team head-to-head correct: +${POINTS.TEAM_H2H} points`);
      
      breakdown.push({
        type: 'TEAM_H2H',
        points: POINTS.TEAM_H2H,
        driver: prediction.predictions.teamHeadToHead.winner // Using 'driver' field for consistency
      });
    } else {
      console.log(`✗ Team head-to-head incorrect. Predicted: ${prediction.predictions.teamHeadToHead.winner}, Actual: ${result.headToHead.teams.winner}`);
    }
  } else if (result.headToHead && result.headToHead.teams && !result.headToHead.teams.winner) {
    // If there was a tie (no winner)
    console.log(`- Team head-to-head was a tie, no points awarded`);
  } else if (prediction.predictions.teamHeadToHead && prediction.predictions.teamHeadToHead.winner) {
    console.log(`- Team head-to-head result not available`);
  }
  
  // Generate a detailed summary of points awarded
  let pointsSummary = "Points breakdown:\n";
  
  // Group by prediction type for cleaner output
  const byType = {};
  breakdown.forEach(item => {
    if (!byType[item.type]) byType[item.type] = [];
    byType[item.type].push(item);
  });
  
  // Build the summary string
  for (const [type, items] of Object.entries(byType)) {
    let totalForType = items.reduce((sum, item) => sum + item.points, 0);
    
    switch(type) {
      case 'POLE_POSITION':
        pointsSummary += `- Pole Position: ${items[0].driver} (+${totalForType} pts)\n`;
        break;
      case 'WINNER':
        pointsSummary += `- Race Winner (P1): ${items[0].driver} (+${totalForType} pts)\n`;
        break;
      case 'SECOND_PLACE':
        pointsSummary += `- Second Place (P2): ${items[0].driver} (+${totalForType} pts)\n`;
        break;
      case 'THIRD_PLACE':
        pointsSummary += `- Third Place (P3): ${items[0].driver} (+${totalForType} pts)\n`;
        break;
      case 'PODIUM_DRIVER':
        pointsSummary += `- Correct podium drivers but wrong position:\n`;
        items.forEach(item => {
          pointsSummary += `  * ${item.driver} (+${item.points} pt)\n`;
        });
        break;
      case 'ALL_PODIUM_CORRECT_ORDER':
        pointsSummary += `- 🎯 BONUS: All 3 podium drivers in correct order (+${totalForType} pts)\n`;
        break;
      case 'ALL_PODIUM_WRONG_ORDER':
        pointsSummary += `- 🎯 BONUS: All 3 podium drivers but wrong order (+${totalForType} pts)\n`;
        break;
      case 'DRIVER_H2H':
        pointsSummary += `- Driver Head-to-Head: Correctly predicted ${items[0].driver} (+${totalForType} pts)\n`;
        break;
      case 'TEAM_H2H':
        pointsSummary += `- Team Head-to-Head: Correctly predicted ${items[0].driver} (+${totalForType} pts)\n`;
        break;
      default:
        pointsSummary += `- ${type}: ${items.map(i => i.driver).join(', ')} (+${totalForType} pts)\n`;
    }
  }
  
  pointsSummary += `\nTotal score: ${scoreValue} points`;
  
  console.log(pointsSummary);
  console.log(`Final score: ${scoreValue} points`);
  console.log("======= SCORE CALCULATION END =======");
  
  return {
    scoreValue,
    breakdown
  };
}

/**
 * Process scores for all users for a specific race
 * @param {string} raceId - MongoDB ID of the race
 * @returns {Array} Array of score objects
 */
async function processScores(raceId) {
  try {
    // Get race results
    const result = await Result.findOne({ race: raceId });
    if (!result) throw new Error('Race results not found');
    
    // Get all predictions for this race
    const predictions = await Prediction.find({ race: raceId }).populate('user');
    console.log(`Processing scores for ${predictions.length} predictions`);
    
    // Calculate scores for each prediction
    const scores = [];
    for (const prediction of predictions) {
      try {
        const { scoreValue, breakdown } = await calculateScore(prediction, result);
        
        // Update prediction with points and breakdown
        prediction.points = scoreValue;
        prediction.scoreBreakdown = breakdown;
        await prediction.save();
        
        console.log(`User ${prediction.user.username}: ${scoreValue} points`);
        
        // Generate user-friendly summary
        const userSummary = generateScoreSummary(prediction, result, breakdown, scoreValue);
        
        // Update user's total score
        await User.findByIdAndUpdate(
          prediction.user._id,
          { $inc: { totalScore: scoreValue } }
        );
        
        scores.push({
          user: prediction.user._id,
          username: prediction.user.username,
          score: scoreValue,
          breakdown,
          prediction: {
            predictions: prediction.predictions
          },
          summaryText: userSummary
        });
      } catch (err) {
        console.error(`Error calculating score for prediction ${prediction._id}:`, err);
      }
    }
    
    return scores;
  } catch (error) {
    console.error('Error processing scores:', error);
    throw error;
  }
}

/**
 * Generate a user-friendly summary of a user's score
 * @param {Object} prediction - User prediction
 * @param {Object} result - Race result
 * @param {Array} breakdown - Score breakdown
 * @param {Number} totalScore - Total score
 * @returns {String} Formatted summary
 */
function generateScoreSummary(prediction, result, breakdown, totalScore) {
  let summary = `\n===== SCORE SUMMARY FOR ${prediction.user.username} =====\n\n`;
  
  // Add prediction vs result section
  summary += "PREDICTIONS vs RESULTS:\n";
  
  // Regular predictions
  summary += `- Pole Position: ${prediction.predictions.polePosition} (Actual: ${result.polePosition})\n`;
  summary += `- Podium: ${prediction.predictions.podium.join(', ')} (Actual: ${result.podium.join(', ')})\n`;
  summary += `- Fastest Lap: ${prediction.predictions.fastestLap} (Actual: ${result.fastestLap})\n`;
  summary += `- First Retirement: ${prediction.predictions.firstRetirement} (Actual: ${result.firstRetirement})\n`;
  
  // Driver head-to-head
  if (prediction.predictions.driverHeadToHead?.winner && result.headToHead?.drivers) {
    const driver1 = result.headToHead.drivers.driver1?.name || prediction.predictions.driverHeadToHead.driver1;
    const driver2 = result.headToHead.drivers.driver2?.name || prediction.predictions.driverHeadToHead.driver2;
    const predictedWinner = prediction.predictions.driverHeadToHead.winner;
    const actualWinner = result.headToHead.drivers.winner;
    
    summary += `- Driver Head-to-Head: ${driver1} vs ${driver2}\n`;
    summary += `  Predicted winner: ${predictedWinner}\n`;
    summary += `  Actual winner: ${actualWinner || 'Tie (no winner)'}\n`;
  }
  
  // Team head-to-head
  if (prediction.predictions.teamHeadToHead?.winner && result.headToHead?.teams) {
    const team1 = result.headToHead.teams.team1?.name || prediction.predictions.teamHeadToHead.team1;
    const team2 = result.headToHead.teams.team2?.name || prediction.predictions.teamHeadToHead.team2;
    const predictedWinner = prediction.predictions.teamHeadToHead.winner;
    const actualWinner = result.headToHead.teams.winner;
    
    summary += `- Team Head-to-Head: ${team1} vs ${team2}\n`;
    summary += `  Predicted winner: ${predictedWinner}\n`;
    summary += `  Actual winner: ${actualWinner || 'Tie (no winner)'}\n`;
  }
  
  // Points breakdown
  summary += "\nPOINTS EARNED:\n";
  
  // Group by prediction type for cleaner output
  const byType = {};
  breakdown.forEach(item => {
    if (!byType[item.type]) byType[item.type] = [];
    byType[item.type].push(item);
  });
  
  // Build the points summary
  for (const [type, items] of Object.entries(byType)) {
    let totalForType = items.reduce((sum, item) => sum + item.points, 0);
    
    switch(type) {
      case 'POLE_POSITION':
        summary += `- Pole Position: ${items[0].driver} (+${totalForType} pts)\n`;
        break;
      case 'WINNER':
        summary += `- Race Winner (P1): ${items[0].driver} (+${totalForType} pts)\n`;
        break;
      case 'SECOND_PLACE':
        summary += `- Second Place (P2): ${items[0].driver} (+${totalForType} pts)\n`;
        break;
      case 'THIRD_PLACE':
        summary += `- Third Place (P3): ${items[0].driver} (+${totalForType} pts)\n`;
        break;
      case 'PODIUM_DRIVER':
        summary += `- Correct podium drivers but wrong position:\n`;
        items.forEach(item => {
          summary += `  * ${item.driver} (+${item.points} pt)\n`;
        });
        break;
      case 'FASTEST_LAP':
        summary += `- Fastest Lap: ${items[0].driver} (+${totalForType} pts)\n`;
        break;
      case 'FIRST_RETIREMENT':
        summary += `- First Retirement: ${items[0].driver} (+${totalForType} pts)\n`;
        break;
      case 'DRIVER_H2H':
        summary += `- Driver Head-to-Head: Correctly predicted ${items[0].driver} (+${totalForType} pts)\n`;
        break;
      case 'TEAM_H2H':
        summary += `- Team Head-to-Head: Correctly predicted ${items[0].driver} (+${totalForType} pts)\n`;
        break;
      case 'ALL_PODIUM_CORRECT_ORDER':
        summary += `- 🎯 BONUS: All 3 podium drivers in correct order (+${totalForType} pts)\n`;
        break;
      case 'ALL_PODIUM_WRONG_ORDER':
        summary += `- 🎯 BONUS: All 3 podium drivers but wrong order (+${totalForType} pts)\n`;
        break;
      default:
        summary += `- ${type}: ${items.map(i => i.driver).join(', ')} (+${totalForType} pts)\n`;
    }
  }
  
  // Total score
  summary += `\nTOTAL SCORE: ${totalScore} points\n`;
  
  return summary;
}


module.exports = {
  calculateScore,
  processScores,
  POINTS
};