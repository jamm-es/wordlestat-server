const mongoose = require('mongoose');

const RawData = mongoose.model('RawData', new mongoose.Schema({
  byLetter: { type: [[{
    correct: { type: Number, required: true },
    wrongPlace: { type: Number, required: true },
    wrongLetter: { type: Number, required: true },
    total: { type: Number, required: true }
  }]], required: true, default: undefined },
  byRow: { type: [{
    correct: { type: Number, required: true },
    wrongPlace: { type: Number, required: true },
    wrongLetter: { type: Number, required: true },
    total: { type: Number, required: true }
  }], required: true, default: undefined },
  wins: { type: [Number], required: true, default: undefined },
  total: { type: Number, required: true },
  wordleNumber: { type: Number, required: true, index: true },
  startTime: { type: Date, required: true, index: true } // data collected should be from the previous 10 minutes
}))

module.exports = RawData;