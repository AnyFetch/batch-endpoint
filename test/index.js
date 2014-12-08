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
  var options = {
    maxPages: 4,
    forwardAuthorizationHeader: true
  };

  before(function createTestServer() {
    server = restify.createServer();
    server.use(restify.queryParser());

    for(var i = 1; i <= 5; i += 1) {
      server.get('/routes/' + i, mockEndpointGenerator(i));
    }
    server.get('/authorization/echo', function(req, res, next) {
      res.send(req.headers.authorization);
      next();
    });

    server.get('/batch', batchEndpointGenerator(server, options));
  });

  describe("GET /batch", function() {
    describe("Valid calls", function() {
      it("should batch-call with a single url", function(done) {
        var pages = ['/routes/1'];
        var url = batchBuilder(pages);

        request(server)
          .get(url)
          .expect(200)
          .expect(function(res) {
            res.body.should.have.keys(pages);
            res.body["/routes/1"].should.have.property("message", 1);
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
            res.body["/routes/1"].should.have.property("message", 1);
            res.body["/routes/2"].should.have.property("message", 2);
          })
          .end(done);
      });

      it("should forward authorization header", function(done) {
        var pages = ['/authorization/echo'];
        var url = batchBuilder(pages);

        request(server)
          .get(url)
          .set('Authorization', 'header-value')
          .expect(200)
          .expect(function(res) {
            res.body.should.have.keys(pages);
            res.body["/authorization/echo"].should.eql('header-value');
          })
          .end(done);
      });
    });

    describe("Errored calls", function() {
      it("should forward errors", function(done) {
        var pages = ['/non/existing/route', '/routes/1'];
        var url = batchBuilder(pages);

        request(server)
          .get(url)
          .expect(404)
          .expect(function(res) {
            res.body.should.have.keys(pages.concat(['errored']));
            res.body.should.have.property('errored', '/non/existing/route');
            res.body['/non/existing/route'].should.have.property('code', 'ResourceNotFound');
          })
          .end(done);
      });

      it("should fail on url without forward slash", function(done) {
        var pages = ['url_without_forward_slash'];
        var url = batchBuilder(pages);

        request(server)
          .get(url)
          .expect(409)
          .expect(/starting with \//)
          .end(done);
      });

      it("should fail without pages parameter", function(done) {
        var pages = [];
        var url = batchBuilder(pages);

        request(server)
          .get(url)
          .expect(409)
          .expect(/at least one page/)
          .end(done);
      });

      it("should fail when pages is over maxPages", function(done) {
        var pages = ['/routes/1', '/routes/2', '/routes/3', '/routes/4', '/routes/5'];
        pages.length.should.be.above(options.maxPages);

        var url = batchBuilder(pages);

        request(server)
          .get(url)
          .expect(409)
          .expect(/more than [0-9]+ url/)
          .end(done);
      });
    });
  });
});
