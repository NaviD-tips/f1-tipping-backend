// C:\Users\clint\f1-tipping-site\backend\routes\scores.js

const express = require('express');
const router = express.Router();
const { processScores } = require('../services/scoreService');
const Prediction = require('../models/Prediction');
const User = require('../models/User');
const Result = require('../models/Result');

        // GET leaderboard - existing endpoint
        router.get('/leaderboard', async (req, res) => {
          try {
            // Change the sort to use totalPoints in descending order (-1)
            const users = await User.find().sort({ totalPoints: -1 });
            
            // Map users to leaderboard format (rest remains the same)
            const leaderboard = users.map((user, index) => ({
              id: user._id,
              username: user.username,
              totalPoints: user.totalPoints || 0,
              correctPredictions: user.correctPredictions || 0,
              rank: index + 1
            }));
            
            res.json(leaderboard);
          } catch (error) {
            console.error('Error fetching leaderboard:', error);
            res.status(500).json({ message: 'Failed to fetch leaderboard' });
          }
        });

// GET scores for a specific race
router.get('/race/:raceId', async (req, res) => {
  try {
    const { raceId } = req.params;
    console.log('Fetching scores for race ID:', raceId); // Debug log
    
    // Get the race result
    const result = await Result.findOne({ race: raceId });
    if (!result) {
      console.log('No results found for race ID:', raceId); // Debug log
      return res.status(404).json({ message: 'Race results not found' });
    }
    
    // Find all predictions for this race with user data
    const predictions = await Prediction.find({ race: raceId })
      .populate('user', 'username')
      .sort({ points: -1 });
    
    console.log(`Found ${predictions.length} predictions for race ID: ${raceId}`); // Debug log
    
    if (!predictions.length) {
      return res.json({ scores: [], result: result });
    }
    
    // Filter out predictions with missing users
    const validPredictions = predictions.filter(p => p.user && p.user._id);
    console.log(`Valid predictions with users: ${validPredictions.length}`);
    
    if (validPredictions.length === 0) {
      return res.json({ scores: [], result: result });
    }
    
    // Format the response data with complete prediction information
    const scores = validPredictions.map(prediction => {
      try {
        return {
          user: prediction.user._id,
          username: prediction.user.username,
          score: prediction.points || 0,
          breakdown: prediction.scoreBreakdown || [],
          prediction: {
            _id: prediction._id,
            predictions: prediction.predictions
          },
          summaryText: formatSummaryText(prediction, result)
        };
      } catch (err) {
        console.error('Error processing prediction:', err);
        return null;
      }
    }).filter(Boolean); // Remove any null entries from mapping errors
    
    // Include the result data with graceful handling for any missing fields
    const response = {
      scores,
      result: {
        podium: result.podium || [],
        polePosition: result.polePosition || null,
        fastestLap: result.fastestLap || null,
        firstRetirement: result.firstRetirement || null,
        // Safely include head-to-head data with null checks
        driverHeadToHead: result.driverHeadToHead ? {
          driver1: result.driverHeadToHead.driver1 || '',
          driver2: result.driverHeadToHead.driver2 || '',
          winner: result.driverHeadToHead.winner || ''
        } : null,
        teamHeadToHead: result.teamHeadToHead ? {
          team1: result.teamHeadToHead.team1 || '',
          team2: result.teamHeadToHead.team2 || '',
          winner: result.teamHeadToHead.winner || ''
        } : null
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error('Detailed error in /race/:raceId:', error);
    res.status(500).json({ 
      message: 'Failed to fetch race scores', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Format a user-friendly summary text for the prediction
function formatSummaryText(prediction, result) {
  try {
    if (!prediction.scoreBreakdown || !prediction.user) return "Summary not available";
    
    const byType = {};
    prediction.scoreBreakdown.forEach(item => {
      if (!byType[item.type]) byType[item.type] = [];
      byType[item.type].push(item);
    });
    
    let summaryText = `===== SCORE SUMMARY FOR ${prediction.user.username || 'Unknown User'} =====\n`;
    summaryText += `Race: ${prediction.race}\n`;
    summaryText += `Total Score: ${prediction.points || 0} points\n\n`;
    
    summaryText += `PREDICTIONS:\n`;
    
    if (prediction.predictions) {
      summaryText += `- Pole Position: ${prediction.predictions.polePosition || 'N/A'}\n`;
      summaryText += `- Podium: ${prediction.predictions.podium ? prediction.predictions.podium.join(', ') : 'N/A'}\n`;
      summaryText += `- Fastest Lap: ${prediction.predictions.fastestLap || 'N/A'}\n`;
      summaryText += `- First Retirement: ${prediction.predictions.firstRetirement || 'N/A'}\n`;
      
      if (prediction.predictions.driverHeadToHead) {
        summaryText += `- Driver H2H: ${prediction.predictions.driverHeadToHead.driver1 || 'N/A'} vs ${prediction.predictions.driverHeadToHead.driver2 || 'N/A'}, Winner: ${prediction.predictions.driverHeadToHead.winner || 'N/A'}\n`;
      }
      
      if (prediction.predictions.teamHeadToHead) {
        summaryText += `- Team H2H: ${prediction.predictions.teamHeadToHead.team1 || 'N/A'} vs ${prediction.predictions.teamHeadToHead.team2 || 'N/A'}, Winner: ${prediction.predictions.teamHeadToHead.winner || 'N/A'}\n`;
      }
    } else {
      summaryText += `- No prediction details available\n`;
    }
    
    if (result) {
      summaryText += `\nRESULTS:\n`;
      summaryText += `- Pole Position: ${result.polePosition || 'N/A'}\n`;
      summaryText += `- Podium: ${result.podium ? result.podium.join(', ') : 'N/A'}\n`;
      summaryText += `- Fastest Lap: ${result.fastestLap || 'N/A'}\n`;
      summaryText += `- First Retirement: ${result.firstRetirement || 'N/A'}\n`;
      
      if (result.driverHeadToHead) {
        summaryText += `- Driver H2H: ${result.driverHeadToHead.driver1 || 'N/A'} vs ${result.driverHeadToHead.driver2 || 'N/A'}, Winner: ${result.driverHeadToHead.winner || 'N/A'}\n`;
      }
      
      if (result.teamHeadToHead) {
        summaryText += `- Team H2H: ${result.teamHeadToHead.team1 || 'N/A'} vs ${result.teamHeadToHead.team2 || 'N/A'}, Winner: ${result.teamHeadToHead.winner || 'N/A'}\n`;
      }
    }
    
    summaryText += `\nPOINTS EARNED:\n`;
    
    for (const [type, items] of Object.entries(byType)) {
      let totalForType = items.reduce((sum, item) => sum + (item.points || 0), 0);
      
      switch(type) {
        case 'POLE_POSITION':
          summaryText += `- Pole Position: ${items[0]?.driver || 'N/A'} (+${totalForType} pts)\n`;
          break;
        case 'WINNER':
          summaryText += `- Race Winner (P1): ${items[0]?.driver || 'N/A'} (+${totalForType} pts)\n`;
          break;
        case 'SECOND_PLACE':
          summaryText += `- Second Place (P2): ${items[0]?.driver || 'N/A'} (+${totalForType} pts)\n`;
          break;
        case 'THIRD_PLACE':
          summaryText += `- Third Place (P3): ${items[0]?.driver || 'N/A'} (+${totalForType} pts)\n`;
          break;
        case 'PODIUM_DRIVER':
          summaryText += `- Correct podium drivers but wrong position:\n`;
          items.forEach(item => {
            summaryText += `  * ${item?.driver || 'N/A'} (+${item?.points || 0} pt)\n`;
          });
          break;
        case 'FASTEST_LAP':
          summaryText += `- Fastest Lap: ${items[0]?.driver || 'N/A'} (+${totalForType} pts)\n`;
          break;
        case 'FIRST_RETIREMENT':
          summaryText += `- First Retirement: ${items[0]?.driver || 'N/A'} (+${totalForType} pts)\n`;
          break;
        case 'DRIVER_H2H':
          const driverWinner = prediction.predictions?.driverHeadToHead?.winner || 'N/A';
          summaryText += `- Driver Head-to-Head: ${driverWinner} (+${totalForType} pts)\n`;
          break;
        case 'TEAM_H2H':
          const teamWinner = prediction.predictions?.teamHeadToHead?.winner || 'N/A';
          summaryText += `- Team Head-to-Head: ${teamWinner} (+${totalForType} pts)\n`;
          break;
        default:
          summaryText += `- ${type}: ${items.map(i => i?.driver || 'N/A').join(', ')} (+${totalForType} pts)\n`;
      }
    }
    
    return summaryText;
  } catch (error) {
    console.error('Error generating summary text:', error);
    return "Error generating summary";
  }
}

// POST calculate all totals
router.post('/calculate-all-totals', async (req, res) => {
  try {
    // Get all users
    const users = await User.find();
    
    for (const user of users) {
      // Get all predictions for this user
      const predictions = await Prediction.find({ user: user._id });
      
      // Calculate total score
      const totalScore = predictions.reduce((total, pred) => total + (pred.points || 0), 0);
      
      // Count correct predictions
      const correctPredictions = predictions.reduce((count, pred) => {
        return count + (pred.scoreBreakdown ? pred.scoreBreakdown.length : 0);
      }, 0);
      
      // Update user
      user.totalScore = totalScore;
      user.correctPredictions = correctPredictions;
      await user.save();
    }
    
    res.json({ message: 'All user scores calculated successfully' });
  } catch (error) {
    console.error('Error calculating scores:', error);
    res.status(500).json({ message: 'Failed to calculate scores' });
  }
});

      // POST calculate all scores
      router.post('/calculate-all-scores', async (req, res) => {
        try {
          // Get all users
          const users = await User.find();
          console.log(`Found ${users.length} users to update`);
          
          const updateResults = [];
          
          for (const user of users) {
            // Find all predictions with points for this user
            const predictions = await Prediction.find({ 
              user: user._id,
              points: { $exists: true, $ne: null }
            });
            
            // Calculate total score using totalPoints
            const totalPoints = predictions.reduce((total, pred) => total + (pred.points || 0), 0);
            
            // Calculate correct predictions count
            const correctPredictions = predictions.reduce((count, pred) => {
              if (!pred.scoreBreakdown) return count;
              return count + pred.scoreBreakdown.length;
            }, 0);
            
            console.log(`User ${user.username}: Score=${totalPoints}, Correct=${correctPredictions}`);
            
            // Update user document using totalPoints
            await User.updateOne(
              { _id: user._id },
              { 
                $set: { 
                  totalPoints: totalPoints,
                  correctPredictions: correctPredictions
                } 
              }
            );
            
            updateResults.push({
              username: user.username,
              totalPoints: totalPoints,
              correctPredictions: correctPredictions
            });
          }
          
          res.json({ 
            success: true, 
            message: `Updated scores for ${users.length} users`,
            results: updateResults
          });
        } catch (error) {
          console.error('Error calculating user scores:', error);
          res.status(500).json({ 
            success: false, 
            message: 'Error calculating user scores',
            error: error.message
          });
        }
      });

// POST process scores for a race
router.post('/process/:raceId', async (req, res) => {
  try {
    const { raceId } = req.params;
    console.log('Processing scores for race ID:', raceId); // Debug log
    
    // Process scores for all predictions for this race
    const scores = await processScores(raceId);
    
    res.json({ 
      success: true, 
      message: `Scores processed successfully for race ${raceId}`,
      scores: scores.length
    });
  } catch (error) {
    console.error('Error processing scores:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process scores',
      error: error.message
    });
  }
});

module.exports = router;