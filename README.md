Restify batch endpoint
=======================

![Build Status](https://travis-ci.org/Papiel/batch-endpoint.png)
![Coverage Status](https://coveralls.io/repos/Papiel/batch-endpoint/badge.png?branch=master)
[![NPM version](https://badge.fury.io/js/batch-endpoint.png)](http://badge.fury.io/js/batch-endpoint)

An endpoint for batch-querying `GET` endpoints on a restify server.

## Usage
Once setup, you'll be able to do the following call:

```
GET /batch?pages=/&pages=/page1&pages=/page2
```

And receive the following response:
```json
{
    "/": "result from / call",
    "/page1": "result from /page1 call",
    "/page2": "result from /page2 call",
}
```

When an error occurs in one endpoint, HTTP status code is piggybacked to the main request, and an `errored` key appear with the invalid page. All other pages will still be loaded.

## Implementation

```javascript
var restify = require('restify');
var batchEndpoint = require('batch-endpoint');

// Initialize server
server = restify.createServer();
server.use(restify.queryParser());

server.get('/endpoint', handlerFunction);
// ... other routes...

server.get('/batch', batchEndpoint(server));
```

### Parameters
`require("batch-endpoint")` takes two parameters:

* `server`, the restify (or HTTP) server to use for `GET` queries. This parameter can be lazy loaded (wrap it in a function which return the server) to avoid circular dependencies in some use-cases.
* `options`, a configuration hash with the following keys:
    - `maxPages`: page limit per queries. Default to 9.
    - `concurrency`: internally, the number of calls to do simultaneously to generate the query. Default to `maxPages`
    - `forwardAuthorizationHeader`: whether all queries should forward the `Authorization` header sent to the batch endpoint.
