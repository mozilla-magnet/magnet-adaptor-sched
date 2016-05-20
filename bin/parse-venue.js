#! /usr/bin/env node

const argv = require('minimist')(process.argv.slice(2));

const usage = 'Use: parseSchedVenue --url=<url>';

if(!argv['url']) {
  console.log(usage);
  process.exit(1);
}

const url = argv['url'];
const sched = require('../lib/sched.js');

const parser = new sched.Venue(url);

parser.parse()
  .then((info) => {
    console.log('Information parsed:');
    console.log(info);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error parsing: ', err);
    process.exit(2);
  });
