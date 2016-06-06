#! /usr/bin/env node

const argv = require('minimist')(process.argv.slice(2));
const pretty = require('prettyjson');

const usage = 'Use: parseSchedVenue --url=<url>';

if(!argv['url']) {
  console.log(usage); // eslint-disable-line no-console
  process.exit(1);
}

const url = argv['url'];
const sched = require('../lib/sched.js');

const parser = new sched.Venue(url);

parser.parse()
  .then((info) => {
    console.log('Information parsed:'); // eslint-disable-line no-console
    console.log(pretty.render(info)); // eslint-disable-line no-console
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error parsing: ', err); // eslint-disable-line no-console
    process.exit(2);
  });
