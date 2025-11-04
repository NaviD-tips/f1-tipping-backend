// C:\Users\clint\f1-tipping-site\backend\models\Team.js

const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  constructorId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  nationality: String,
  url: String,
  active: {
    type: Boolean,
    default: true
  },
  drivers: [
    {
      driverId: String,
      code: String,
      name: String
    }
  ],
  seasons: [String]
});

const Team = mongoose.model('Team', teamSchema);
module.exports = Team;