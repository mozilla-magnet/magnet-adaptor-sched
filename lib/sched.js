'use strict';

/**
 * Dependencies
 */

const debug = require('debug')('magnet-adaptor-sched:parser');
const nocache = require('superagent-no-cache');
const request = require('superagent');
const cheerio = require('cheerio');
const moment = require('moment');
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

Venue.prototype.getLink = function(id) {
  const parts = url.parse(this.url);
  return 'https://' + parts['host'] + '/mobile/#session:' + id;
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

      // Icon
      const icon = $('meta[property="og:image:secure_url"]').attr('content');

      // Date, just parse the next day
      var dateElem = $('.sched-container-header');
      if (dateElem.length) {
        date = dateElem.attr('id');
      }

      // Parse events for the next day
      var sessions = [];
      var evt = $('.sched-container-top');
      while (date && evt != null && hasClass(evt, 'sched-container-top')) {
        var evts = [];
        evt = evt !== null ? evt.next() : null;

        while (evt[0] && !hasClass(evt, 'sched-container-bottom')) {
          // Parse two siblings first one for
          // time and second for name and link.
          var time = evt[0].children[0].data.trim();
          time = moment(`${date} ${time}`, 'YYYY-MM-DD h:mma').toString();

          evt = evt.next();
          // Hack to get the current sched-container div
          var container = $(evt.children()[0]);
          container.find('a').toArray().forEach((a) => {
            a = $(a);
            var link = this.getLink(a.attr('id'));
            var title = a[0].children[0].data;

            evts.push({
              time,
              title,
              link
            });
          });

          // Continue parsing for next events in the venue
          evt = evt.next();
        }
        sessions.push({
          date,
          sessions: evts
        });
        evt = evt.next();
        if (hasClass(evt, 'sched-container-header')) {
          date = evt.attr('id');
          evt = evt.nextUntil('sched-container-top');
        }
      }

      return {
        title,
        icon,
        venue,
        events: sessions
      };
    });
};

const SchedModule = {
  Venue: Venue
};

module.exports = SchedModule;
