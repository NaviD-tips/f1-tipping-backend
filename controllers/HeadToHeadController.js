// C:\Users\clint\f1-tipping-site\backend\controllers\HeadToHeadController.js

const Race = require('../models/Race');
const Result = require('../models/Result');

/**
 * Get head-to-head data for a specific race
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getHeadToHeadData = async (req, res) => {
  try {
    const { raceId } = req.params;
    
    // Fetch race for configuration
    const race = await Race.findById(raceId);
    if (!race) {
      return res.status(404).json({ message: 'Race not found' });
    }
    
    // Fetch results for actual outcomes
    const result = await Result.findOne({ race: raceId });
    
    // Format data for frontend
    const response = {
      configuration: {
        drivers: race.headToHead?.drivers || null,
        teams: race.headToHead?.teams || null
      },
      results: {
        drivers: result?.headToHead?.drivers || null,
        teams: result?.headToHead?.teams || null
      }
    };
    
    // Log what we're sending
    console.log('Sending head-to-head data:', JSON.stringify(response, null, 2));
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching head-to-head data:', error);
    res.status(500).json({ message: 'Failed to fetch head-to-head data' });
  }
};

module.exports = {
  getHeadToHeadData
};