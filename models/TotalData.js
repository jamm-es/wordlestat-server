const mongoose = require('mongoose');

const TotalData = mongoose.model('TotalData', new mongoose.Schema({
  byLetter: { type: [[{
    correct: { type: Number, required: true },
    wrongPlace: { type: Number, required: true },
    wrongLetter: { type: Number, required: true },
    total: { type: Number, required: true },
    _id: false
  }]], required: true, default: undefined },
  byRow: { type: [{
    correct: { type: Number, required: true },
    wrongPlace: { type: Number, required: true },
    wrongLetter: { type: Number, required: true },
    total: { type: Number, required: true },
    _id: false
  }], required: true, default: undefined },
  wins: { type: [Number], required: true, default: undefined },
  total: { type: Number, required: true },
}))

module.exports = TotalData;