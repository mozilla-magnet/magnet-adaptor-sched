const express = require('express');
const router = express.Router();
const sched = require('../lib/sched.js');
const debug = require('debug')('magnet-adaptor-sched:router');

function redirectNoSchedUrl(req, res) {
  res.render('empty', {
    host: req.headers.host,
    path: req.originalUrl,
    protocol: req.secure ? 'https' : 'http',
  });
}

router.get('/', (req, res) => {
  debug(req.query);
  var schedUrl = req.query.url;
  if (!schedUrl) {
    redirectNoSchedUrl(req, res);
  } else {
    schedUrl = schedUrl.replace(/ /g, '+');
    const parser = new sched.venue(schedUrl);
    parser.parse()
      .then((data) => {
        const transformed = encodeURIComponent(JSON.stringify(data));
        const oembed = `/oembed/?data=${transformed}`;
        res.render('index', {
          data,
          schedUrl,
          oembed,
        });
      })
      .catch((err) => {
        debug('Error parsing ', err);
        redirectNoSchedUrl(req, res);
      });
  }
});

router.get('/oembed/', (req, res) => {
  debug('Trying to get oembed data for ', req.query);
  var data = req.query.data;
  if (!data) {
    return res.render('error', {status: 'No data'});
  }
  try {
    data = JSON.parse(decodeURIComponent(data));
  } catch(err) {
    return res.render('error', err);
  }
  debug('Got data ', data);
  res.render('oembed', data);
});

module.exports = router;
