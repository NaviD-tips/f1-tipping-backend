const express = require('express');
const mongoose = require('mongoose');
const Prediction = require('../models/Prediction');
const Race = require('../models/Race');
const auth = require('../middleware/auth');

const router = express.Router();

// Get upcoming races for predictions
router.get('/races/upcoming', auth, async (req, res) => {
  try {
    const now = new Date();
    
    // Find races that haven't happened yet
    const upcomingRaces = await Race.find({
      date: { $gt: now }
    }).sort({ date: 1 }).limit(5);
    
    res.json(upcomingRaces);
  } catch (error) {
    console.error('Error fetching upcoming races:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit a prediction - clean, simplified version
router.post('/', auth, async (req, res) => {
  try {
    const { raceId, predictions } = req.body;
    const userId = req.user.id;
    
    console.log(`Processing prediction submission - User: ${userId}, Race: ${raceId}`);
    
    // 1. Check for existing predictions
    const existingPrediction = await Prediction.findOne({ 
      user: userId, 
      race: raceId 
    });
    
    if (existingPrediction) {
      console.log('Existing prediction found - rejecting submission');
      return res.status(400).json({ 
        message: 'Predictions already submitted' 
      });
    }
    
    // 2. Check if race exists (optional validation)
    let race = null;
    try {
      race = await Race.findById(raceId);
    } catch (err) {
      console.error('Error finding race:', err);
      // Continue anyway - we'll create the prediction without race validation
    }
    
    // 3. If race exists, check if it's in the past
    if (race) {
      const now = new Date();
      if (race.date < now) {
        return res.status(400).json({ 
          message: 'Predictions are closed for this race' 
        });
      }
    }
    
    // 4. Create and save the prediction
    const prediction = new Prediction({
      user: userId,
      race: raceId,
      predictions
    });
    
    await prediction.save();
    console.log('Prediction saved successfully');
    
    // 5. Return success response
    return res.status(201).json({
      message: 'Prediction submitted successfully',
      prediction
    });
    
  } catch (error) {
    console.error('Error processing prediction:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Predictions already submitted' 
      });
    }
    
    // Handle other errors
    return res.status(500).json({ 
      message: 'Failed to submit predictions' 
    });
  }
});

// Simplified prediction submission (alternative endpoint)
router.post('/simple', auth, async (req, res) => {
  try {
    console.log('Simple prediction submission received');
    
    const { raceId, predictions } = req.body;
    const userId = req.user.id;
    
    // Check for existing predictions
    const existingPrediction = await Prediction.findOne({ 
      user: userId, 
      race: raceId 
    });
    
    if (existingPrediction) {
      console.log('Existing prediction found - rejecting submission');
      return res.status(400).json({ 
        message: 'Predictions already submitted' 
      });
    }
    
    // Create new prediction without checking for race
    const prediction = new Prediction({
      user: userId,
      race: raceId,  // We trust the raceId without validation
      predictions
    });
    
    await prediction.save();
    console.log('Simple prediction saved successfully');
    
    res.status(201).json({
      message: 'Prediction submitted successfully',
      prediction
    });
  } catch (error) {
    console.error('Simple prediction error:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Predictions already submitted' 
      });
    }
    
    res.status(500).json({ message: 'Failed to submit predictions' });
  }
});

router.get('/user', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`Fetching predictions for user: ${userId}`);
    
    // Get raw predictions and examine their structure
    const rawPredictions = await Prediction.find({ user: userId }).lean();
    
    if (rawPredictions.length > 0) {
      // Log the full structure of the first prediction
      console.log('Sample prediction structure:', JSON.stringify(rawPredictions[0], null, 2));
      
      // Check if race is stored correctly
      const raceIds = rawPredictions.map(p => ({
        id: p.race ? p.race.toString() : 'missing',
        type: p.race ? typeof p.race : 'undefined',
        prediction_id: p._id.toString()
      }));
      console.log('Race ID details:', raceIds);
    } else {
      console.log('No predictions found for this user');
    }
    
    // Check races collection
    const racesCount = await Race.countDocuments();
    console.log(`Total races in database: ${racesCount}`);
    
    if (rawPredictions.length > 0 && rawPredictions[0].race) {
      // Try to find the race directly
      const sampleRaceId = rawPredictions[0].race;
      const race = await Race.findById(sampleRaceId);
      console.log(`Looking up race with ID ${sampleRaceId}: ${race ? 'Found' : 'Not found'}`);
    }
    
    // Continue with your existing code...
    const predictions = await Prediction.find({ user: userId })
      .populate('race')
      .sort({ createdAt: -1 });
      
    // Same enhancement logic...
    const enhancedPredictions = predictions.map(prediction => {
      const predObj = prediction.toObject();
      
      if (!predObj.race) {
        predObj.race = {
          raceName: `Race ID: ${prediction.race || 'Missing'}`,
          date: predObj.createdAt || new Date(),
          _id: prediction.race || 'unknown',
          isPlaceholder: true
        };
      }
      
      return predObj;
    });
    
    res.json(enhancedPredictions);
  } catch (error) {
    console.error('Error fetching user predictions:', error);
    console.error('Error details:', error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Clear all predictions
router.get('/clear', async (req, res) => {
  try {
    await Prediction.deleteMany({});
    res.json({ message: 'All predictions cleared' });
  } catch (error) {
    console.error('Error clearing predictions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check if user has already submitted predictions for a race
router.get('/check/:raceId', auth, async (req, res) => {
  try {
    const raceId = req.params.raceId;
    const userId = req.user.id;
    
    const existingPrediction = await Prediction.findOne({
      user: userId,
      race: raceId
    });
    
    res.json({
      hasSubmitted: !!existingPrediction,
      message: existingPrediction ? 
        'You have already submitted predictions for this race' : 
        'No predictions found for this race'
    });
  } catch (error) {
    console.error('Error checking predictions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
// Clear all predictions endpoint
router.get('/clear-all', async (req, res) => {
  try {
    const Prediction = mongoose.model('Prediction');
    
    // Delete all predictions
    const result = await Prediction.deleteMany({});
    
    res.json({
      message: `Deleted ${result.deletedCount} predictions`,
      success: true
    });
  } catch (error) {
    console.error('Error clearing predictions:', error);
    res.status(500).json({ message: error.message });
  }
});

router.get('/debug', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const rawPredictions = await Prediction.find({ user: userId }).lean();
    res.json({
      count: rawPredictions.length,
      data: rawPredictions
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all predictions for a specific race (for predictions comparison page)
router.get('/race/:raceId', auth, async (req, res) => {
  try {
    const raceId = req.params.raceId;
    
    console.log(`Fetching all predictions for race: ${raceId}`);
    
    // Find all predictions for this race and populate user information
    const predictions = await Prediction.find({ race: raceId })
      .populate('user', 'username email') // Adjust fields as needed based on your User model
      .lean();
    
    console.log(`Found ${predictions.length} predictions for race ${raceId}`);
    
    // Transform the data to include username and make it easier to work with
    const transformedPredictions = predictions.map(prediction => ({
      userId: prediction.user._id,
      username: prediction.user.username || prediction.user.email || 'Unknown User',
      predictions: prediction.predictions,
      submittedAt: prediction.createdAt
    }));
    
    res.json(transformedPredictions);
  } catch (error) {
    console.error('Error fetching race predictions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get prediction for a specific race
router.get('/:raceId', auth, async (req, res) => {
  try {
    const raceId = req.params.raceId;
    const userId = req.user.id;
    
    console.log(`Fetching prediction for user ${userId} and race ${raceId}`);
    
    const prediction = await Prediction.findOne({
      user: userId,
      race: raceId
    });
    
    if (prediction) {
      return res.json({
        hasPrediction: true,
        prediction
      });
    } else {
      return res.json({
        hasPrediction: false,
        message: 'No prediction found for this race'
      });
    }
  } catch (error) {
    console.error('Error fetching prediction:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST endpoint for submitting predictions for a specific race
router.post('/:raceId', auth, async (req, res) => {
  try {
    const raceId = req.params.raceId;
    const userId = req.user.id;
    const { predictions } = req.body;
    
    console.log(`Submitting prediction for user ${userId}, race ${raceId}`);
    
    // Check for existing predictions
    const existingPrediction = await Prediction.findOne({ 
      user: userId, 
      race: raceId 
    });
    
    if (existingPrediction) {
      // If prediction exists, update it
      existingPrediction.predictions = predictions;
      await existingPrediction.save();
      
      return res.json({
        message: 'Prediction updated successfully',
        prediction: existingPrediction
      });
    } else {
      // Create new prediction
      const prediction = new Prediction({
        user: userId,
        race: raceId,
        predictions
      });
      
      await prediction.save();
      
      return res.json({
        message: 'Prediction submitted successfully',
        prediction
      });
    }
  } catch (error) {
    console.error('Error submitting prediction:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Predictions already submitted' 
      });
    }
    
    res.status(500).json({ 
      message: 'Failed to submit predictions',
      error: error.message 
    });
  }
});

module.exports = router;