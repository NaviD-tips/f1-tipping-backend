const express = require('express');
const router = express.Router();
const Hike = require('../models/Hike');
const HikeEntry = require('../models/HikeEntry');
const auth = require('../middleware/auth');

// Get all hikes for the authenticated user
router.get('/', auth, async (req, res) => {
  try {
    const hikes = await Hike.find({ userId: req.user.id, isActive: true })
      .sort({ createdAt: -1 });
    res.json(hikes);
  } catch (error) {
    console.error('Error fetching hikes:', error);
    res.status(500).json({ message: 'Failed to fetch hikes' });
  }
});

// Get a specific hike
router.get('/:id', auth, async (req, res) => {
  try {
    const hike = await Hike.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    });
    
    if (!hike) {
      return res.status(404).json({ message: 'Hike not found' });
    }
    
    res.json(hike);
  } catch (error) {
    console.error('Error fetching hike:', error);
    res.status(500).json({ message: 'Failed to fetch hike' });
  }
});

// Create a new hike
router.post('/', auth, async (req, res) => {
  try {
    const { name, totalDistance, budget } = req.body;

    // Validation
    if (!name || !totalDistance || !budget) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (totalDistance <= 0 || budget <= 0) {
      return res.status(400).json({ message: 'Distance and budget must be positive numbers' });
    }

    const hike = new Hike({
      name,
      totalDistance,
      budget,
      userId: req.user.id
    });

    await hike.save();
    res.status(201).json(hike);
  } catch (error) {
    console.error('Error creating hike:', error);
    res.status(500).json({ message: 'Failed to create hike' });
  }
});

// Update a hike
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, totalDistance, budget, isActive } = req.body;

    const hike = await Hike.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    });

    if (!hike) {
      return res.status(404).json({ message: 'Hike not found' });
    }

    if (name) hike.name = name;
    if (totalDistance !== undefined) hike.totalDistance = totalDistance;
    if (budget !== undefined) hike.budget = budget;
    if (isActive !== undefined) hike.isActive = isActive;

    await hike.save();
    res.json(hike);
  } catch (error) {
    console.error('Error updating hike:', error);
    res.status(500).json({ message: 'Failed to update hike' });
  }
});

// Delete a hike (soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const hike = await Hike.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    });

    if (!hike) {
      return res.status(404).json({ message: 'Hike not found' });
    }

    hike.isActive = false;
    await hike.save();
    
    res.json({ message: 'Hike deleted successfully' });
  } catch (error) {
    console.error('Error deleting hike:', error);
    res.status(500).json({ message: 'Failed to delete hike' });
  }
});

// Get all entries for a specific hike
router.get('/:id/entries', auth, async (req, res) => {
  try {
    const hike = await Hike.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    });

    if (!hike) {
      return res.status(404).json({ message: 'Hike not found' });
    }

    const entries = await HikeEntry.find({ hikeId: req.params.id })
      .sort({ date: 1 });
    
    res.json(entries);
  } catch (error) {
    console.error('Error fetching hike entries:', error);
    res.status(500).json({ message: 'Failed to fetch hike entries' });
  }
});

// Create a new hike entry
router.post('/:id/entries', auth, async (req, res) => {
  try {
    const hike = await Hike.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    });

    if (!hike) {
      return res.status(404).json({ message: 'Hike not found' });
    }

    const {
      date,
      kmTravelled,
      rpe,
      moneySpent,
      mood,
      sleepQuality,
      overallFeeling,
      caloriesSpent,
      weatherTemp,
      weatherType
    } = req.body;

    // Validation
    if (!date || kmTravelled === undefined || !rpe || moneySpent === undefined || 
        !mood || !sleepQuality || !overallFeeling || caloriesSpent === undefined || 
        !weatherTemp || !weatherType) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const entry = new HikeEntry({
      hikeId: req.params.id,
      userId: req.user.id,
      date,
      kmTravelled,
      rpe,
      moneySpent,
      mood,
      sleepQuality,
      overallFeeling,
      caloriesSpent,
      weatherTemp,
      weatherType
    });

    await entry.save();
    res.status(201).json(entry);
  } catch (error) {
    console.error('Error creating hike entry:', error);
    res.status(500).json({ message: 'Failed to create hike entry' });
  }
});

// Update a hike entry
router.put('/:hikeId/entries/:entryId', auth, async (req, res) => {
  try {
    const entry = await HikeEntry.findOne({
      _id: req.params.entryId,
      hikeId: req.params.hikeId,
      userId: req.user.id
    });

    if (!entry) {
      return res.status(404).json({ message: 'Entry not found' });
    }

    // Update fields
    const updateFields = [
      'date', 'kmTravelled', 'rpe', 'moneySpent', 'mood', 
      'sleepQuality', 'overallFeeling', 'caloriesSpent', 'weatherTemp', 'weatherType'
    ];

    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        entry[field] = req.body[field];
      }
    });

    await entry.save();
    res.json(entry);
  } catch (error) {
    console.error('Error updating hike entry:', error);
    res.status(500).json({ message: 'Failed to update hike entry' });
  }
});

// Delete a hike entry
router.delete('/:hikeId/entries/:entryId', auth, async (req, res) => {
  try {
    const result = await HikeEntry.deleteOne({
      _id: req.params.entryId,
      hikeId: req.params.hikeId,
      userId: req.user.id
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Entry not found' });
    }

    res.json({ message: 'Entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting hike entry:', error);
    res.status(500).json({ message: 'Failed to delete hike entry' });
  }
});

// Get statistics for a hike
router.get('/:id/stats', auth, async (req, res) => {
  try {
    const hike = await Hike.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    });

    if (!hike) {
      return res.status(404).json({ message: 'Hike not found' });
    }

    const entries = await HikeEntry.find({ hikeId: req.params.id })
      .sort({ date: 1 });

    // Calculate totals
    const totalKmTravelled = entries.reduce((sum, entry) => sum + entry.kmTravelled, 0);
    const totalMoneySpent = entries.reduce((sum, entry) => sum + entry.moneySpent, 0);

    // Calculate remaining
    const distanceRemaining = Math.max(0, hike.totalDistance - totalKmTravelled);
    const budgetRemaining = Math.max(0, hike.budget - totalMoneySpent);

    // Calculate percentages
    const distancePercentage = hike.totalDistance > 0 
      ? ((totalKmTravelled / hike.totalDistance) * 100).toFixed(1)
      : 0;
    const budgetPercentage = hike.budget > 0 
      ? ((totalMoneySpent / hike.budget) * 100).toFixed(1)
      : 0;

    res.json({
      hike,
      entries,
      stats: {
        totalKmTravelled,
        totalMoneySpent,
        distanceRemaining,
        budgetRemaining,
        distancePercentage,
        budgetPercentage,
        totalEntries: entries.length
      }
    });
  } catch (error) {
    console.error('Error fetching hike stats:', error);
    res.status(500).json({ message: 'Failed to fetch hike statistics' });
  }
});

module.exports = router;
