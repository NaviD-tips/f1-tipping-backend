// C:\Users\clint\f1-tipping-site\backend\routes\f1data.js

const express = require('express');
const router = express.Router();
const Race = require('../models/Race');
const Driver = require('../models/Driver');
const Team = require('../models/Team');
const ergastService = require('../services/ergastService');
const auth = require('../middleware/auth');

/**
 * @route   GET /api/f1data/races/all
 * @desc    Get all races
 * @access  Private
 */
router.get('/races/all', auth, async (req, res) => {
  try {
    console.log('Fetching all races');
    const races = await Race.find().sort({ date: 1 });
    console.log(`Found ${races.length} races`);
    
    // Add prediction status to each race manually
    const racesWithStatus = races.map(race => {
      let predictionsOpen = true;
      let predictionClosingTime = null;
      
      if (race.qualifyingDateTime) {
        const qualifyingTime = new Date(race.qualifyingDateTime);
        
        // Verify the date is valid
        if (isNaN(qualifyingTime.getTime())) {
          console.error(`Invalid qualifying datetime for race ${race._id}:`, race.qualifyingDateTime);
          predictionsOpen = false;
        } else {
          // Calculate when predictions close (2 minutes before qualifying)
          predictionClosingTime = new Date(qualifyingTime.getTime() - (2 * 60 * 1000));
          predictionsOpen = new Date() < predictionClosingTime;
          
          // Debug logging
          console.log(`Race ${race.raceName}:`);
          console.log(`  Qualifying time: ${qualifyingTime.toISOString()}`);
          console.log(`  Predictions close: ${predictionClosingTime.toISOString()}`);
          console.log(`  Predictions open: ${predictionsOpen}`);
        }
      }
      
      return {
        ...race.toObject(),
        predictionsOpen,
        predictionClosingTime
      };
    });
    
    res.json(racesWithStatus);
  } catch (error) {
    console.error('Error fetching all races:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

/**
 * @route   GET /api/f1data/races/:id
 * @desc    Get race by ID
 * @access  Private
 */
router.get('/races/:id', auth, async (req, res) => {
  try {
    const race = await Race.findById(req.params.id);
    
    if (!race) {
      return res.status(404).json({ message: 'Race not found' });
    }
    
    // Check if predictions are still open based on qualifyingDateTime
    let predictionsOpen = true;
    let predictionClosingTime = null;
    
    if (race.qualifyingDateTime) {
      const qualifyingTime = new Date(race.qualifyingDateTime);
      
      // Verify the date is valid
      if (isNaN(qualifyingTime.getTime())) {
        console.error(`Invalid qualifying datetime for race ${race._id}:`, race.qualifyingDateTime);
        predictionsOpen = false;
      } else {
        // Calculate when predictions close (2 minutes before qualifying)
        predictionClosingTime = new Date(qualifyingTime.getTime() - (2 * 60 * 1000));
        predictionsOpen = new Date() < predictionClosingTime;
        
        // Debug logging
        console.log(`Single race ${race.raceName}:`);
        console.log(`  Raw qualifying datetime: ${race.qualifyingDateTime}`);
        console.log(`  Qualifying time: ${qualifyingTime.toISOString()}`);
        console.log(`  Predictions close: ${predictionClosingTime.toISOString()}`);
        console.log(`  Current time: ${new Date().toISOString()}`);
        console.log(`  Predictions open: ${predictionsOpen}`);
      }
    }
    
    // Add prediction status to response
    const raceWithStatus = {
      ...race.toObject(),
      predictionsOpen,
      predictionClosingTime
    };
    
    res.json(raceWithStatus);
  } catch (error) {
    console.error('Error fetching race by ID:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/f1data/drivers
 * @desc    Get all drivers - first from DB, then from API if none found
 * @access  Private
 */
router.get('/drivers', auth, async (req, res) => {
  try {
    console.log('Fetching drivers');
    
    // First try to get from database
    let drivers = await Driver.find({}).sort({ familyName: 1 });
    
    // If no drivers in DB, fetch from API
    if (!drivers || drivers.length === 0) {
      console.log('No drivers found in database, fetching from Jolpica API');
      
      try {
        // Get drivers from API
        const apiDrivers = await ergastService.fetchDrivers();
        
        if (apiDrivers && apiDrivers.length > 0) {
          console.log(`Fetched ${apiDrivers.length} drivers from API, saving to database`);
          
          // Save to database for future use
          drivers = await Driver.insertMany(apiDrivers);
          console.log(`Saved ${drivers.length} drivers to database`);
        }
      } catch (apiError) {
        console.error('Error fetching from API:', apiError);
        // Continue with empty array if API fails
      }
    }
    
    console.log(`Returning ${drivers.length} drivers`);
    res.json(drivers);
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/f1data/teams
 * @desc    Get all teams - first from DB, then from API if none found
 * @access  Private
 */
router.get('/teams', auth, async (req, res) => {
  try {
    console.log('Fetching teams');
    
    // First try to get from database
    let teams = await Team.find({}).sort({ name: 1 });
    
    // If no teams in DB, fetch from API
    if (!teams || teams.length === 0) {
      console.log('No teams found in database, fetching from Jolpica API');
      
      try {
        // Get constructors from API
        const apiConstructors = await ergastService.fetchConstructors();
        
        if (apiConstructors && apiConstructors.length > 0) {
          console.log(`Fetched ${apiConstructors.length} constructors from API, saving to database`);
          
          // Save to database for future use
          teams = await Team.insertMany(apiConstructors);
          console.log(`Saved ${teams.length} teams to database`);
        }
      } catch (apiError) {
        console.error('Error fetching from API:', apiError);
        // Continue with empty array if API fails
      }
    }
    
    console.log(`Returning ${teams.length} teams`);
    res.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   PATCH /api/f1data/races/:id
 * @desc    Update race (for admin use)
 * @access  Private (admin only)
 */
router.patch('/races/:id', auth, async (req, res) => {
  try {
    // TODO: Add admin check here
    
    const { headToHead } = req.body;
    
    const race = await Race.findById(req.params.id);
    if (!race) {
      return res.status(404).json({ message: 'Race not found' });
    }
    
    // Update head-to-head configuration
    if (headToHead) {
      race.headToHead = headToHead;
    }
    
    await race.save();
    res.json(race);
  } catch (error) {
    console.error('Error updating race:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;