// C:\Users\clint\f1-tipping-site\backend\services\scheduledTasks.js

const cron = require('node-cron');
const Race = require('../models/Race');
const { processAndSaveResults } = require('./resultsService');
const { processScores } = require('./scoreService');

// Check for new results every hour
function scheduleResultsCheck() {
  console.log('Scheduling result checks...');
  
  // Run once at startup
  performResultCheck();
  
  // Schedule to run every hour
  cron.schedule('0 * * * *', async () => {
    console.log('Running scheduled result check...');
    await performResultCheck();
  });
}

// Check for races that need processing
async function performResultCheck() {
  try {
    console.log('Executing result check...');
    
    // Find races that have ended but don't have results yet
    const currentDate = new Date();
    const pendingRaces = await Race.find({
      date: { $lt: currentDate },
      status: { $ne: 'completed' }
    });
    
    console.log(`Found ${pendingRaces.length} races needing result processing`);
    
    // Process each race
    for (const race of pendingRaces) {
      try {
        // Check if at least 3 hours have passed since race start
        const raceTime = new Date(race.date);
        const hoursSinceRace = (currentDate - raceTime) / (1000 * 60 * 60);
        
        if (hoursSinceRace < 3) {
          console.log(`Race ${race.raceName} finished less than 3 hours ago, waiting...`);
          continue;
        }
        
        console.log(`Processing results for ${race.raceName}`);
        
        // Fetch and save results
        const results = await processAndSaveResults(race._id);
        console.log(`Results saved for ${race.raceName}`);
        
        // Calculate scores
        const scores = await processScores(race._id);
        console.log(`Processed ${scores.length} predictions for ${race.raceName}`);
      } catch (error) {
        console.error(`Error processing race ${race.raceName}:`, error);
      }
    }
    
    console.log('Result check completed');
  } catch (error) {
    console.error('Error checking for new results:', error);
  }
}

module.exports = {
  scheduleResultsCheck
};