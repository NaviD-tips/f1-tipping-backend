const express = require('express');
const router = express.Router();
const Result = require('../models/Result');
const Race = require('../models/Race');
const Prediction = require('../models/Prediction'); // ADD THIS IMPORT
const auth = require('../middleware/auth');
const { processAndSaveResults } = require('../services/resultsService');
const scoreService = require('../services/scoreService');
const ergastService = require('../services/ergastService');

// Get results for a specific race
router.get('/race/:raceId', auth, async (req, res) => {
  try {
    const raceId = req.params.raceId;
    console.log(`Fetching results for race ID: ${raceId}`);
    
    // First check if we have results stored
    let result = await Result.findOne({ race: raceId });
    
    // If no results or no driver results, process them
    if (!result || !result.results || result.results.length === 0) {
      console.log('No detailed results found, processing results');
      try {
        result = await processAndSaveResults(raceId);
      } catch (processError) {
        console.error('Error processing results:', processError);
        // Continue with whatever result we might have
      }
    }
    
    if (!result) {
      return res.status(404).json({ message: 'Results not found for this race' });
    }
    
    console.log(`Returning race results with ${result.results?.length || 0} driver results`);
    res.json(result);
  } catch (error) {
    console.error('Error fetching race results:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all completed race results
router.get('/', auth, async (req, res) => {
  try {
    const results = await Result.find().populate('race');
    res.json(results);
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Manually trigger result processing for a race (admin only) - FIXED VERSION
router.post('/process/:raceId', auth, async (req, res) => {
  try {
    const raceId = req.params.raceId;
    const force = req.query.force === 'true'; // Check for force parameter
    
    console.log(`\n=== PROCESSING RESULTS FOR RACE ${raceId} ${force ? '(FORCE RECALCULATE)' : ''} ===`);
    
    // Get the race
    const race = await Race.findById(raceId);
    if (!race) {
      return res.status(404).json({ message: 'Race not found' });
    }
    
    console.log(`Processing race: ${race.raceName}`);
    
    // Check existing predictions to see if scores already exist
    const existingPredictions = await Prediction.find({ race: raceId }).populate('user');
    console.log(`📊 Found ${existingPredictions.length} existing predictions`);
    
    if (existingPredictions.length === 0) {
      return res.status(404).json({ message: 'No predictions found for this race' });
    }
    
    // Check if scores already exist
    const existingScores = existingPredictions.filter(pred => pred.points !== undefined && pred.points !== null);
    console.log(`📊 Found ${existingScores.length} existing scores`);
    
    if (existingScores.length > 0 && !force) {
      console.log('ℹ️  Scores already exist and force=false, skipping recalculation');
      return res.json({
        message: `Scores already processed for ${race.raceName}`,
        results: 0,
        scores: existingScores.length,
        skipped: true
      });
    }
    
    if (force && existingScores.length > 0) {
      console.log('🔄 Force recalculate requested, clearing existing scores...');
      
      // Show scores before clearing
      console.log('\n--- SCORES BEFORE FORCE RECALCULATION ---');
      existingScores.forEach(pred => {
        console.log(`${pred.user.username}: ${pred.points} points`);
        if (pred.scoreBreakdown && pred.scoreBreakdown.length > 0) {
          console.log(`  Breakdown types: ${pred.scoreBreakdown.map(b => b.type).join(', ')}`);
        }
      });
      
      // Clear existing scores
      const resetResult = await Prediction.updateMany(
        { race: raceId },
        { 
          $unset: { points: 1, scoreBreakdown: 1 }
        }
      );
      console.log(`🗑️  Reset ${resetResult.modifiedCount} existing scores`);
    }
    
    // Process results (fetch F1 data)
    console.log('📥 Processing F1 results...');
    const results = await processAndSaveResults(raceId);
    
    // Process scores using the updated logic
    console.log('\n--- STARTING SCORE CALCULATION ---');
    const scores = await scoreService.processScores(raceId);
    console.log(`✅ Processed ${scores.length} scores`);
    
    // Show scores after calculation
    console.log('\n--- SCORES AFTER CALCULATION ---');
    const updatedPredictions = await Prediction.find({ race: raceId }).populate('user');
    updatedPredictions.forEach(pred => {
      console.log(`${pred.user.username}: ${pred.points} points`);
      if (pred.scoreBreakdown && pred.scoreBreakdown.length > 0) {
        console.log(`  Breakdown types: ${pred.scoreBreakdown.map(b => b.type).join(', ')}`);
        // Check for bonus points specifically
        const bonusPoints = pred.scoreBreakdown.filter(b => 
          b.type === 'ALL_PODIUM_CORRECT_ORDER' || b.type === 'ALL_PODIUM_WRONG_ORDER'
        );
        if (bonusPoints.length > 0) {
          console.log(`  🎯 BONUS POINTS: ${bonusPoints.map(b => `${b.type}:${b.points}`).join(', ')}`);
        }
      }
    });
    
    console.log(`\n=== PROCESSING COMPLETE ${force ? '(FORCED)' : ''} ===\n`);
    
    res.json({
      message: force 
        ? `Scores forcefully recalculated for ${race.raceName}` 
        : `Results and scores processed for ${race.raceName}`,
      results: results.results?.length || 0,
      scores: scores.length,
      forced: force
    });
    
  } catch (error) {
    console.error('❌ Error processing results:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Manually fetch race results from Ergast API
router.post('/fetch-from-api/:raceId', auth, async (req, res) => {
  try {
    const raceId = req.params.raceId;
    
    // Get the race
    const race = await Race.findById(raceId);
    if (!race) {
      return res.status(404).json({ message: 'Race not found' });
    }

    console.log(`Fetching results from API for ${race.season} round ${race.round}`);
    
    // Call the Ergast API through our service
    const apiResults = await ergastService.fetchRaceResults(race.season, race.round);
    
    if (!apiResults) {
      return res.status(404).json({ message: 'No results found in Ergast API' });
    }
    
    console.log('API results for first retirement calculation:', {
      firstRetirement: apiResults.firstRetirement,
      positionData: apiResults.results
        .filter(d => d.status !== 'Disqualified')
        .map(d => ({
          driverId: d.driverId,
          code: d.code, 
          position: d.position,
          status: d.status
        }))
        .sort((a, b) => parseInt(b.position) - parseInt(a.position))
        .slice(0, 3) // Show top 3 highest positions (last placed)
    });
    
    // Get existing result or create new one
    let result = await Result.findOne({ race: raceId });
    if (!result) {
      result = new Result({
        race: raceId,
        season: race.season,
        round: race.round
      });
    }
    
    // Explicitly handle the firstRetirement field
    console.log('Setting first retirement to:', apiResults.firstRetirement);
    
    // Update result with API data
    result.polePosition = apiResults.polePosition || result.polePosition;
    result.podium = apiResults.podium || result.podium;
    result.fastestLap = apiResults.fastestLap || result.fastestLap;
    result.firstRetirement = apiResults.firstRetirement; // Don't use || operator here
    result.results = apiResults.results;
    
    console.log('Updated result before saving:', {
      firstRetirement: result.firstRetirement,
      polePosition: result.polePosition,
      fastestLap: result.fastestLap
    });
    
    await result.save();
    
    res.json({
      message: `Successfully fetched and saved ${apiResults.results.length} driver results for ${race.raceName}`,
      firstRetirement: result.firstRetirement,
      result
    });
  } catch (error) {
    console.error('Error fetching from API:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/debug/:raceId', async (req, res) => {
  try {
    const raceId = req.params.raceId;
    console.log('Debug endpoint called for raceId:', raceId);
    
    // First check if the race exists
    const race = await Race.findById(raceId);
    if (!race) {
      return res.status(404).json({ message: 'Race not found' });
    }
    
    console.log('Race found:', race.raceName);
    
    // Try to log what head-to-head configuration exists
    if (race.headToHead) {
      console.log('Race has head-to-head configuration:', JSON.stringify(race.headToHead, null, 2));
    } else {
      console.log('Race does not have head-to-head configuration');
    }
    
    // Try to fetch from Ergast API first
    console.log(`Trying to fetch results from API for ${race.season} round ${race.round}`);
    let apiResults;
    try {
      apiResults = await ergastService.fetchRaceResults(race.season, race.round);
      console.log(`API results:`, apiResults ? `Found ${apiResults.results.length} results` : 'No results found');
    } catch (apiError) {
      console.error('Error fetching from API:', apiError);
    }
    
    // Re-run the process function with debug logging
    try {
      // First, delete any existing result
      await Result.deleteOne({ race: raceId });
      console.log('Deleted existing result');
      
      // Reprocess with extensive debugging
      const result = await processAndSaveResults(raceId);
      
      return res.json({
        message: 'Debug reprocessing complete',
        apiResults: apiResults ? {
          resultsCount: apiResults.results.length,
          polePosition: apiResults.polePosition,
          fastestLap: apiResults.fastestLap,
          firstRetirement: apiResults.firstRetirement
        } : null,
        result
      });
    } catch (processError) {
      console.error('Error in reprocessing:', processError);
      return res.status(500).json({ message: 'Error reprocessing', error: processError.message });
    }
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Simple test endpoint to verify changes
router.get('/test-last-placed', auth, async (req, res) => {
  console.log('Test last-placed endpoint called');
  
  try {
    // Hard-coded positions for testing
    const drivers = [
     // { driverId: 'bortoleto', position: '14', status: 'Finished' },
     // { driverId: 'alonso', position: '17', status: 'Retired' },
     // { driverId: 'leclerc', position: '18', status: 'Disqualified' }
    ];
    
    console.log('Test drivers:', drivers);
    
    // Find last placed non-disqualified driver
    let lastPlacedDriver = null;
    let highestPosition = -1;
    
    for (const driver of drivers) {
      if (driver.status === 'Disqualified') continue;
      
      const posNum = parseInt(driver.position);
      console.log(`Testing ${driver.driverId}: position ${posNum} vs current highest ${highestPosition}`);
      
      if (!isNaN(posNum) && posNum > highestPosition) {
        highestPosition = posNum;
        lastPlacedDriver = driver;
        console.log(`New last placed driver: ${driver.driverId} (Position: ${posNum})`);
      }
    }
    
    const firstRetirement = lastPlacedDriver ? lastPlacedDriver.driverId : null;
    console.log(`First retirement should be: ${firstRetirement}`);
    
    return res.json({
      message: 'Test completed',
      lastPlacedDriver,
      firstRetirement
    });
  } catch (error) {
    console.error('Error in test endpoint:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;