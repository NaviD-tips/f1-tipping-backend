const express = require('express');
const User = require('../models/User');

const router = express.Router();

// Get leaderboard
router.get('/', async (req, res) => {
  try {
    const users = await User.find()
      .select('username totalPoints')
      .sort({ totalPoints: -1 })
      .limit(100);
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;