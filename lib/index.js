'use strict';

var async = require('async');
var supertest = require('supertest');
var restify = require('restify');

module.exports = function endpointGenerator(server, options) {
  if(!options) {
    options = {};
  }

  options.maxPages = options.maxPages || 9;
  options.concurrency = options.concurrency || options.maxPages;
  options.forwardAuthorizationHeader = options.forwardAuthorizationHeader || false;


  return function(req, res, next) {
    // Lazy loading for server (avoid circular dependencies)
    if(typeof server === 'function') {
      server = server();
    }

    var json = {};
    var statusCode = 200;

    if(!req.params.pages) {
      return next(new restify.MissingParameterError("Please specify at least one page to load."));
    }

    if(typeof req.params.pages !== 'object') {
      req.params.pages = [req.params.pages];
    }

    if(req.params.pages.length > options.maxPages) {
      return next(new restify.InvalidArgumentError("You can't batch call more than " + options.maxPages + " urls."));
    }

    var isErrored = req.params.pages.some(function(page) {
      return typeof page !== 'string' || page.length === 0 || page[0] !== "/";
    });

    if(isErrored) {
      return next(new restify.InvalidArgumentError("Pages must be properly escaped URL starting with /"));
    }

    var pages = req.params.pages.slice(0, options.maxPages);

    async.eachLimit(
      pages,
      options.concurrency,
      function dispatchQueries(page, cb) {
        var query = supertest(server).get(page);

        if(options.forwardAuthorizationHeader) {
          query.set('authorization', req.headers.authorization);
        }

        query
          .expect(200)
          .end(function(err, res) {
            if (err) {
              json.errored = page;
              statusCode = (res && res.statusCode) ? res.statusCode : 500;
            }

            json[page] = (res && res.body) ? res.body : {};

            cb();
          });
      },
      function sendDatas() {
        res.send(statusCode, json);
        next();
      });
  };
};
