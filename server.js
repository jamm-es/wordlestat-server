/*
server.js is responsible for responding to web requests on the API
endpoint, using the database to return results
*/

const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const WordleData = require('./models/WordleData');
const RawData = require('./models/RawData');
const cors = require('cors');

const credentials = require('./reader-credentials.json');

mongoose
  .connect(`mongodb://${credentials.host}:${credentials.port}/${credentials.db}`, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    user: credentials.username,
    pass: credentials.password
  })
  .then(() => {
    const app = express();

    app.disable('x-powered-by');
    app.use(helmet());
    app.use(cors({ origin: [/wordlestat\.com$/, /localhost:[0-9]+$/] }))

    app.get('/wordle-data/:wordleNumber', (req, res) => {
      WordleData
        .findOne({ wordleNumber: req.params.wordleNumber })
        .select('-_id -__v')
        .lean()
        .exec((err, wordleData) => {
          if(err) {
            console.log(`Internal server error`);
            console.log(err);
            return res.status(500).json({ message: 'Internal server error' })
          }

          if(wordleData === null) return res.status(404).json({ message: 'Stats not found' });

          return res.status(200).json(wordleData);
        });
    });

    app.listen(80);
    console.log('Listening on port 80');
  })