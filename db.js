/*
db.js is responsible for gathering data from the Twitter API
and placing the returned results of the python script into the
MongoDB database
*/

const mongoose = require('mongoose');
const cron = require('node-cron');
const { spawn } = require('child_process');
const RawData = require('./models/RawData');
const WordleData = require('./models/WordleData');

const credentials = require('./writer-credentials.json');

mongoose
  .connect(`mongodb://${credentials.host}:${credentials.port}/${credentials.db}`, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    user: credentials.username,
    pass: credentials.password
  })
  .then(() => {
    let inProgress = false;
    let prevNewestId = '';

    cron.schedule('*/10 * * * *', now => {    
      console.log(`Current time: ${now}`);
      if(inProgress) {
        console.log('!!!!! get_data.py already running, skipping this time... !!!!!');
        return;
      }
      inProgress = true;

      let response = '';

      const startTime = new Date();
      startTime.setSeconds(1);
      startTime.setMilliseconds(0);
      startTime.setMinutes(Math.round(startTime.getMinutes()/10)*10-10);
      
      const useStartTime = prevNewestId === '';

      const getData = spawn('python', ['-u', 'get_data.py', useStartTime ? 'time' : 'id', useStartTime ? startTime.toISOString().slice(0, -5)+'Z' : prevNewestId]);

      getData.stderr.on('data', data => {
        console.log(`[get_data.py] ${data}`);
      });

      getData.stdout.on('data', data => {
        response += data.toString()
      });

      getData.on('close', (code, signal) => {
        console.log(`get_data.py exited with code ${code} and signal ${signal}`);
        if(code !== 0) {
          console.log('Errored.');
          inProgress = false;
          return;
        }

        responseJSON = JSON.parse(response);
        prevNewestId = responseJSON.newestId;

        const promises = [];
        for(const [wordleName, partialStats] of Object.entries(responseJSON.data)) {
          partialStats.wordleNumber = +wordleName.slice(7)
          WordleData
            .findOne({ wordleNumber: partialStats.wordleNumber })
            .exec((err, wordleData) => {
              if(err) return console.log(`Error finding for wordle data: ${err}`);

              // couldn't find document, create new
              if(wordleData === null) {
                promises.push(new WordleData(partialStats).save());
              }

              // otherwise, update current document
              else {
                for(let i = 0; i < 6; ++i) {
                  for(let j = 0; j < 5; ++j) {
                    wordleData.byLetter[i][j].correct += partialStats.byLetter[i][j].correct;
                    wordleData.byLetter[i][j].wrongPlace += partialStats.byLetter[i][j].wrongPlace;
                    wordleData.byLetter[i][j].wrongLetter += partialStats.byLetter[i][j].wrongLetter;
                    wordleData.byLetter[i][j].total += partialStats.byLetter[i][j].total;
                  }
                }
                for(let i = 0; i < 6; ++i) {
                  wordleData.byRow[i].correct += partialStats.byRow[i].correct;
                  wordleData.byRow[i].wrongPlace += partialStats.byRow[i].wrongPlace;
                  wordleData.byRow[i].wrongLetter += partialStats.byRow[i].wrongLetter;
                  wordleData.byRow[i].total += partialStats.byRow[i].total;
                }
                for(let i = 0; i < 7; ++i) {
                  wordleData.wins[i] += partialStats.wins[i];
                }
                wordleData.total += partialStats.total;
                
                promises.push(wordleData.save());
              }

              partialStats.startTime = startTime;
              promises.push(new RawData(partialStats).save());
            });
        }

        Promise.all(promises)
          .then(() => {
            inProgress = false;
            console.log('Saved all data');
          })
          .catch(err => {
            console.log(`Error saving data: ${err}`);
          });
      });
    });
  });