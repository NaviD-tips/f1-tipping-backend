const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  race: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Race',
    required: true,
    validate: {
      validator: async function(v) {
        // Optional: Add validation to check if race exists
        if (!mongoose.Types.ObjectId.isValid(v)) return false;
        return true;
      },
      message: props => `${props.value} is not a valid race ID!`
    }
  },
  predictions: {
    podium: [String],
    fastestLap: String,
    polePosition: String,
    firstRetirement: String,
    driverHeadToHead: {
      driver1: String,
      driver2: String,
      winner: String,
    },
    teamHeadToHead: {
      team1: String,
      team2: String,
      winner: String
    }
  },
  points: {
    type: Number,
    default: 0
  },
  // Add scoreBreakdown field to store detailed scoring information
  scoreBreakdown: {
    type: Array,
    default: []
  },
  submitted: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Ensure one prediction per user per race
predictionSchema.index({ user: 1, race: 1 }, { unique: true });

// Pre-save hook to ensure race is a valid ObjectId
predictionSchema.pre('save', function(next) {
  if (this.race && !mongoose.Types.ObjectId.isValid(this.race)) {
    return next(new Error('Invalid Race ID format'));
  }
  next();
});

const Prediction = mongoose.model('Prediction', predictionSchema);
module.exports = Prediction;