
/**
 * Dependencies
 */

const debug = require('debug')('magnet-adaptor-sched:router');
const sched = require('../lib/sched');
const express = require('express');
const router = express.Router();

/**
 * The base-url of the embed. Can be
 * configured when not hosted on usual
 * tengam.org production server.
 *
 * @type {String}
 */
const BASE_URL = process.env.BASE_URL || 'https://tengam.org/adaptors/sched/';

router.get('/', (req, res) => {
  var schedUrl = req.query.url;
  debug('sched url', schedUrl);
  if (!schedUrl) return redirectNoSchedUrl(req, res);

  // we don't know how the client has encoded
  // the `url` param, so we decode it completely
  // and re-encode to ensure it's normalized.
  schedUrl = encodeURI(decodeURIComponent(schedUrl));

  const parser = new sched.Venue(schedUrl);

  parser.parse()
    .then((data) => {
      const transformed = encodeURIComponent(JSON.stringify(data));
      const oembed = `oembed?data=${transformed}`;
      const embed = `embed?data=${transformed}`;

      res.render('index', {
        data,
        schedUrl,
        oembed,
        embed
      });
    })

    .catch((err) => {
      debug('Error parsing ', err.stack);
      redirectNoSchedUrl(req, res);
    });
});

router.get('/oembed', (req, res, next) => {
  var data = req.query.data;
  if (!data) next(new Error('missing `data=` query parameter'));

  // express seems to decode query params automatically
  var encoded = encodeURIComponent(data);

  res.json({
    width: 300,
    height: 300,
    html: `<iframe src="${BASE_URL}embed?data=${encoded}">`
  });
});

router.get('/embed', (req, res) => {
  debug('Trying to get oembed data for ', req.query);

  var data = req.query.data;
  if (!data) return res.render('error', {message: 'No data'});

  try {
    data = JSON.parse(decodeURIComponent(data));
  } catch (err) {
    return res.render('error', err);
  }

  debug('got data ', data);
  res.render('embed', data);
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
