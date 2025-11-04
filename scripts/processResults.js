// C:\Users\clint\f1-tipping-site\backend\scripts\processResults.js

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Race = require('../models/Race');
const Result = require('../models/Result');
const { updateHeadToHeadResults } = require('./updateRaceStatus');
const { processScores } = require('./services/ScoreService');

// Load environment variables
dotenv.config();

/**
 * Process race results and calculate scores
 * @param {string} raceId - MongoDB ID of the race to process
 */
const processResults = async (raceId) => {
  try {
    // Connect to database if not already connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
    
    console.log(`Processing results for race ID: ${raceId}`);
    
    // Step 1: Update the head-to-head results
    console.log('Updating head-to-head results...');
    await updateHeadToHeadResults(raceId);
    
    // Step 2: Process scores for all predictions
    console.log('Processing prediction scores...');
    const scores = await processScores(raceId);
    
    // Step 3: Mark race as processed
    await Race.findByIdAndUpdate(raceId, { resultsProcessed: true });
    
    console.log(`Processed ${scores.length} prediction scores successfully.`);
    return scores;
    
  } catch (error) {
    console.error('Error processing results:', error.message);
    throw error;
  } finally {
    // Disconnect from database if we connected within this function
    if (mongoose.connection.readyState === 1 && process.argv[1].includes('processResults.js')) {
      await mongoose.disconnect();
    }
  }
};

// If script is run directly from command line
if (require.main === module) {
  // Check if raceId is provided as command line argument
  const raceId = process.argv[2];
  
  if (!raceId) {
    console.error('Please provide a race ID as argument');
    process.exit(1);
  }
  
  processResults(raceId)
    .then(() => {
      console.log('Results processed successfully');
      process.exit(0);
    })
    .catch(err => {
      console.error('Error:', err.message);
      process.exit(1);
    });
}

module.exports = { processResults };