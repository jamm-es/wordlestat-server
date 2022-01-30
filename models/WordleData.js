const mongoose = require('mongoose');

const WordleData = mongoose.model('WordleData', new mongoose.Schema({
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
  wordleNumber: { type: Number, required: true, unique: true }
}))

module.exports = WordleData;