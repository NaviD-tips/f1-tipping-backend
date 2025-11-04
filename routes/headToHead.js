// C:\Users\clint\f1-tipping-site\backend\routes\headToHead.js

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Result = require('../models/Result');
const Race = require('../models/Race');
const Prediction = require('../models/Prediction');
const auth = require('../middleware/auth');

/**
 * @route   GET /api/head-to-head/:raceId
 * @desc    Get head-to-head results for a specific race
 * @access  Private (requires auth)
 */
router.get('/:raceId', auth, async (req, res) => {
  try {
    const { raceId } = req.params;
    
    // Fetch race data to get head-to-head configuration
    const race = await Race.findById(raceId);
    if (!race) {
      return res.status(404).json({ message: 'Race not found' });
    }
    
    // Fetch race results to get head-to-head winners
    const result = await Result.findOne({ race: raceId });
    
    // Prepare response object with both configuration and results
    const headToHeadData = {
      configuration: race.headToHead || { drivers: null, teams: null },
      results: result?.headToHead || { drivers: null, teams: null }
    };
    
    // Return the data
    res.json(headToHeadData);
    
  } catch (error) {
    console.error('Error fetching head-to-head data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/head-to-head/process/:raceId
 * @desc    Process head-to-head results for a race
 * @access  Private (requires admin)
 */
router.post('/process/:raceId', auth, async (req, res) => {
  try {
    // Check if user is admin (implement your auth check here)
    
    const { raceId } = req.params;
    
    try {
      // Import and use the updateHeadToHeadResults function
      const { updateHeadToHeadResults } = require('../scripts/updateRaceStatus');
      const result = await updateHeadToHeadResults(raceId);
      
      res.json({
        message: 'Head-to-head results processed successfully',
        result: result.headToHead
      });
    } catch (error) {
      console.error('Error processing head-to-head results:', error);
      res.status(500).json({ message: error.message || 'Server error' });
    }
  } catch (error) {
    console.error('Error in head-to-head processing endpoint:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Make sure to export the router!
module.exports = router;