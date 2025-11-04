// C:\Users\clint\f1-tipping-site\backend\models\Result.js

const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  race: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Race',
    required: true,
    unique: true
  },
  season: {
    type: String,
    required: true
  },
  round: {
    type: String,
    required: true
  },
  polePosition: {
    type: String
  },
  podium: {
    type: [String],
    validate: {
      validator: function(arr) {
        return arr.length <= 3; // Ensure no more than top 3
      },
      message: 'Podium can only have 3 drivers maximum'
    }
  },
  fastestLap: {
    type: String
  },
  firstRetirement: {
    type: String
  },
  results: [{
    position: String,
    driverId: String,
    code: String,
    givenName: String,
    familyName: String,
    constructorId: String,
    constructorName: String,
    grid: String,
    status: String,
    points: Number,
    laps: Number,
    time: String,
    fastestLap: {
      rank: String,
      lap: String,
      time: String,
      averageSpeed: {
        units: String,
        speed: String
      }
    }
  }],
  // Enhanced head-to-head structure
  headToHead: {
    drivers: {
      driver1: {
        driverId: String,
        code: String,
        name: String,
        position: String
      },
      driver2: {
        driverId: String,
        code: String,
        name: String,
        position: String
      },
      winner: String
    },
    teams: {
      team1: {
        constructorId: String,
        name: String
      },
      team2: {
        constructorId: String,
        name: String
      },
      winner: String
    }
  },
  processedDate: {
    type: Date,
    default: Date.now
  }
});

// Create a useful text representation of the result for logging/debugging
resultSchema.methods.getSummary = function() {
  let summary = `${this.season} Round ${this.round} Results:\n`;
  summary += `Pole: ${this.polePosition || 'N/A'}\n`;
  summary += `Podium: ${this.podium.join(', ') || 'N/A'}\n`;
  summary += `Fastest Lap: ${this.fastestLap || 'N/A'}\n`;
  summary += `First Retirement: ${this.firstRetirement || 'N/A'}\n`;
  
  // Add head-to-head results
  if (this.headToHead?.drivers) {
    const driver1Name = this.headToHead.drivers.driver1?.name || this.headToHead.drivers.driver1?.driverId || 'N/A';
    const driver2Name = this.headToHead.drivers.driver2?.name || this.headToHead.drivers.driver2?.driverId || 'N/A';
    const winnerName = this.headToHead.drivers.winner || 'Tie';
    
    summary += `Driver H2H: ${driver1Name} vs ${driver2Name}, Winner: ${winnerName}\n`;
  }
  
  if (this.headToHead?.teams) {
    const team1Name = this.headToHead.teams.team1?.name || this.headToHead.teams.team1?.constructorId || 'N/A';
    const team2Name = this.headToHead.teams.team2?.name || this.headToHead.teams.team2?.constructorId || 'N/A';
    const winnerName = this.headToHead.teams.winner || 'Tie';
    
    summary += `Team H2H: ${team1Name} vs ${team2Name}, Winner: ${winnerName}\n`;
  }
  
  return summary;
};

// Ensure only one result document per race
resultSchema.index({ race: 1 }, { unique: true });

const Result = mongoose.model('Result', resultSchema);
module.exports = Result;