
/**
 * Dependencies
 */

const debug = require('debug')('magnet-adaptor-sched:router');
const sched = require('../lib/sched.js');
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  debug(req.query);
  var schedUrl = req.query.url;
  if (!schedUrl) return redirectNoSchedUrl(req, res);

  schedUrl = schedUrl.replace(/ /g, '+');
  const parser = new sched.Venue(schedUrl);

  parser.parse()
    .then((data) => {
      const transformed = encodeURIComponent(JSON.stringify(data));
      const oembed = `oembed?data=${transformed}`;
      res.render('index', {
        data,
        schedUrl,
        oembed
      });
    })

    .catch((err) => {
      debug('Error parsing ', err);
      redirectNoSchedUrl(req, res);
    });
});

router.get('/oembed', (req, res) => {
  debug('Trying to get oembed data for ', req.query);

  var data = req.query.data;
  if (!data) return res.render('error', {message: 'No data'});

  try {
    data = JSON.parse(decodeURIComponent(data));
  } catch (err) {
    return res.render('error', err);
  }

  debug('got data ', data);
  res.render('oembed', data);
});

function redirectNoSchedUrl(req, res) {
  res.render('empty', {
    host: req.headers.host,
    path: req.originalUrl,
    protocol: req.secure ? 'https' : 'http'
  });
}

/**
 * Exports
 */

module.exports = router;
