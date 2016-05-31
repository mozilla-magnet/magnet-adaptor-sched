'use strict';

/**
 * Dependencies
 */

const debug = require('debug')('magnet-adaptor-sched:parser');
const nocache = require('superagent-no-cache');
const request = require('superagent');
const cheerio = require('cheerio');
const url = require('url');

function fetch(url) {
  debug('fetch', url);
  return new Promise((resolve, reject) => {
    request.get(url)
      .use(nocache)
      .end((err, result) => {
        if (err) {
          return reject(err);
        }
        resolve(result.text);
      });
  });
}

function getDocument(html) {
  debug('get document');
  const doc = cheerio.load(html);
  return Promise.resolve(doc);
}

/**
 * Initialize a new `Venue`
 *
 * @param {String} url
 */
function Venue(url) {
  debug('new venue', url);
  this.url = url;
}

Venue.prototype.parse = function() {
  return this.parseLight();
};

Venue.prototype.getLink = function(absolutePath) {
  return url.resolve(this.url, absolutePath);
};

// .hasClass in cheerio is not really reliable, so
// we needed to reimplement it checking for attribute class
function hasClass(doc, className) {
  var attr = doc.attr('class');
  return attr && attr.indexOf(className) > -1;
}

Venue.prototype.parseLight = function() {
  return fetch(this.url)
    .then(getDocument)
    .then(($) => {
      var date;

      // Event title
      var title = $('title').text();
      title = title.substr(0, title.indexOf(':'));

      // Venue
      const venue = $('#sched-page-home-breadcrumb strong').text();

      // Date, just parse the next day
      const dateElem = $('.sched-container-header');
      if (dateElem.length) {
        date = formatTime(dateElem.attr('id'));
      }

      var icon = $('meta[property="og:image:secure_url"]').attr('content');

      // Parse events for the next day
      var evt = $('.sched-container-top');
      evt = evt !== null ? evt.next() : null;
      var events = [];

      while (evt[0] && !hasClass(evt, 'sched-container-bottom')) {
        // Parse two siblings first one for
        // time and second for name and link.
        var time = evt[0].children[0].data;

        evt = evt.next();
        // Hack to get the current sched-container div
        var container = $(evt.children()[0]);
        container.find('a').toArray().forEach((a) => {
          a = $(a);
          var link = this.getLink(a.attr('href'));
          var title = a[0].children[0].data;

          events.push({
            time,
            title,
            link
          });
        });

        // Continue parsing for next events in the venue
        evt = evt.next();
      }

      // Limit the number of next events to a maximun of 3
      events = events.slice(0, 3);

      if (!events.length) {
        events.push({ title: 'empty' });
      }

      return {
        title,
        icon,
        venue,
        date,
        events
      };
    });
};

function formatTime(string) {
  var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const components = string.split('-');
  const month = months[parseInt(components[1], 10) -1];
  const day = components[2];
  return `${day} ${month}`;
}

const SchedModule = {
  Venue: Venue
};

module.exports = SchedModule;
