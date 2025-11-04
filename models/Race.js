// C:\Users\clint\f1-tipping-site\backend\models\Race.js

const mongoose = require('mongoose');

const raceSchema = new mongoose.Schema({
  // Base race information
  season: {
    type: String,
    required: true
  },
  round: {
    type: String,
    required: true
  },
  raceName: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String
  },
  qualifyingDateTime: {
    type: Date
  },
  circuit: {
    name: String,
    location: String,
    country: String
  },
  status: {
    type: String,
    enum: ['upcoming', 'active', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  
  // Race prediction controls
  predictionsOpen: {
    type: Boolean,
    default: true
  },
  predictionClosingTime: {
    type: Date
  },
  resultsProcessed: {
    type: Boolean,
    default: false
  },
  
  // Head-to-head configuration
  headToHead: {
    drivers: {
      driver1: {
        driverId: String,
        code: String,
        name: String
      },
      driver2: {
        driverId: String,
        code: String,
        name: String
      }
    },
    teams: {
      team1: {
        constructorId: String,
        name: String
      },
      team2: {
        constructorId: String,
        name: String
      }
    }
  }
}, { 
  timestamps: true,
  // Enable toObject and toJSON for the virtuals
  toObject: { virtuals: true },
  toJSON: { virtuals: true }
});

// Virtual for time until prediction closing
raceSchema.virtual('timeUntilClose').get(function() {
  if (!this.predictionClosingTime) return null;
  
  const now = new Date();
  const closing = new Date(this.predictionClosingTime);
  const timeLeft = closing - now;
  
  if (timeLeft <= 0) return "Closed";
  
  const seconds = Math.floor(timeLeft / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
});

// Create an index on season and round for faster lookups
raceSchema.index({ season: 1, round: 1 }, { unique: true });

const Race = mongoose.model('Race', raceSchema);
module.exports = Race;