
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
      data = transformData(data);
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

function formatTime(string) {
  var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const components = string.split('-');
  const month = months[parseInt(components[1], 10) -1];
  const day = components[2];
  return day + " " + month;
}

function transformData(data) {
  // Parse data to send just the current/future events of the
  // current day.
  const events = data.events;
  var event = events.find(function(s) {
    var x1 = new Date(s.date);
    var x2 = new Date();
    var diff = x2 - x1;
    if (diff <= 0) {
      return s;
    } else if (diff / 1000 / 60 / 60 / 24 < 1) {
      // within same day
      return true;
    }
    return false;
  });
  if (event) {
    const sessions = event.sessions;
    const showDate = formatTime(event.date);
    var now = Date.now();
    var index = sessions.findIndex(function(s) {
      var d = new Date(s.time);
      return (d - now) >= 0;
    });
    // Adjust the index
    if (index !== -1) {
      if (index !== 0) {
        // Get the previous session.
        index--;
      }
    } else {
      // Check first element just in case is in the future.
      if (events.length > 0) {
        var e = events[0];
        if ((e - now) >= 0) {
          index = 0;
        }
      }
    }

    if (index != -1) {
      sessions = sessions.slice(index);
      // Cut to a maximum of 5
      sessions = sessions.slice(0, 4);
      // Strip tz of dates on events and leve just time
      sessions.forEach(event => {
        const date = new Date(event.time);
        const hours = ("0" + date.getHours()).slice(-2);
        const minutes = ("0" + date.getMinutes()).slice(-2);
        event.time = `${hours}:${minutes}`;
      });
      data.events = {
        date: showDate,
        sessions
      };
    } else {
      data.events = {};
    }
  } else {
    data.events = {};
  }

  return data;
}

/**
 * Exports
 */

module.exports = router;
