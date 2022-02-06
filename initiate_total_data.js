/*
initiate_mean_calculation.js is responsible for calculating the mean for all past raw data
so that db.js, when it's updated, can seamlessly update the same document.
*/

const mongoose = require('mongoose');
const WordleData = require('./models/WordleData');
const TotalData = require('./models/TotalData');

const credentials = require('./writer-credentials.json');

mongoose
  .connect(`mongodb://${credentials.host}:${credentials.port}/${credentials.db}`, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    user: credentials.username,
    pass: credentials.password
  })
  .then(() => {
    // delete current mean data document
    TotalData
      .deleteMany()
      .exec(err => {
        if(err) return console.log(`Error deleting MeanData documents: ${err}`);
        
        WordleData
          .find()
          .lean()
          .exec((err, results) => {
            if(err) return console.log(`Error finding every wordle data: ${err}`);

            let total = 0;
            let wins = new Array(7).fill(0);
            let byRow = new Array(6).fill().map(() => ({
              correct: 0,
              wrongPlace: 0,
              wrongLetter: 0,
              total: 0
            }));
            let byLetter = new Array(6).fill().map(() => new Array(5).fill().map(() => ({
              correct: 0,
              wrongPlace: 0,
              wrongLetter: 0,
              total: 0
            })));
            for(res of results) {
              total += res.total;
              wins = wins.map((d, i) => d + res.wins[i]);
              byRow = byRow.map((d, i) => ({
                correct: d.correct + res.byRow[i].correct,
                wrongPlace: d.wrongPlace + res.byRow[i].wrongPlace,
                wrongLetter: d.wrongLetter + res.byRow[i].wrongLetter,
                total: d.total + res.byRow[i].total,
              }));
              byLetter = byLetter.map((a, i) => a.map((d, j) => ({
                correct: d.correct + res.byLetter[i][j].correct,
                wrongPlace: d.wrongPlace + res.byLetter[i][j].wrongPlace,
                wrongLetter: d.wrongLetter + res.byLetter[i][j].wrongLetter,
                total: d.total + res.byLetter[i][j].total,
              })));
            }

            new TotalData({
              byLetter: byLetter,
              byRow: byRow,
              wins: wins,
              total: total
            }).save(() => {
              console.log('Total data saved');
              mongoose.connection.close().then(() => {
                console.log('Closed db connection');
              });
            });
          })
      });
  });