'use strict';

require('should');
var request = require('supertest');
var restify = require('restify');

var batchEndpointGenerator = require('../lib/');


var mockEndpointGenerator = function(out) {
  return function(req, res, next) {
    res.send({message: out});
    next();
  };
};


var batchBuilder = function(pages, url) {
  url = url || '/batch';
  url += '?pages=';
  url += pages.map(encodeURIComponent).join('&pages=');
  return url;
};


describe('Restify batch endpoint', function() {
  var server;
  before(function createTestServer() {
    server = restify.createServer();
    server.use(restify.queryParser());

    for(var i = 1; i <= 5; i += 1) {
      server.get('/routes/' + i, mockEndpointGenerator(i));
    }

    server.get('/batch', batchEndpointGenerator(server));
  });

  describe("GET /batch", function() {

    describe.only("Default option call", function() {
      it("should batch-call with a single url", function(done) {
        var pages = ['/routes/1'];
        var url = batchBuilder(pages);

        request(server)
          .get(url)
          .expect(200)
          .expect(function(res) {
            res.body.should.have.keys(pages);
            res.body["/routes/1"].should.have.property("message", "1");
          })
          .end(done);
      });

      it("should batch-call urls", function(done) {
        var pages = ['/routes/1', '/routes/2'];
        var url = batchBuilder(pages);

        request(server)
          .get(url)
          .expect(200)
          .expect(function(res) {
            res.body.should.have.keys(pages);
            res.body["/routes/1"].should.have.property("message", "1");
            res.body["/routes/2"].should.have.property("message", "2");
          })
          .end(done);
      });
    });
  });
});
