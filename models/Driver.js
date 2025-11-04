// C:\Users\clint\f1-tipping-site\backend\models\Driver.js

const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  driverId: {
    type: String,
    required: true,
    unique: true
  },
  code: {
    type: String,
    required: true
  },
  givenName: {
    type: String,
    required: true
  },
  familyName: {
    type: String,
    required: true
  },
  dateOfBirth: String,
  nationality: String,
  url: String,
  permanentNumber: String,
  teams: [
    {
      season: String,
      constructorId: String,
      name: String
    }
  ],
  active: {
    type: Boolean,
    default: true
  }
});

// Virtual for driver's full name
driverSchema.virtual('fullName').get(function() {
  return `${this.givenName} ${this.familyName}`;
});

const Driver = mongoose.model('Driver', driverSchema);
module.exports = Driver;