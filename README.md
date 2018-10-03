# indy-request

[![build status](https://secure.travis-ci.org/Picolab/node-indy-request.svg)](https://travis-ci.org/Picolab/node-indy-request)

Make requests to Indy (i.e. Sovrin) nodes using node.js

```js
let IndyReq = require('indy-request')

let node = IndyReq({
  host: '127.0.0.1',
  port: 9702,
  serverKey: bs58.decode('HXrfcFWDjWusENBoXhV8mARzq51f1npWYWaA1GzfeMDG')
})

let response = await node.send({
  operation: {
    type: IndyReq.type.GET_TXN + '',
    ledgerId: 1,
    data: 9
  },
  identifier: 'MSjKTWkPLtYoPEaTF1TUDb',
  protocolVersion: 2
})

console.log(response)
```

## API

### node = IndyReq(conf)

* `conf.host` the host string i.e. `10.0.0.2`
* `conf.port` the port of the indy node you want to connect to
* `conf.serverKey` the Buffer of the node's curve25519 key
* `conf.timeout` (optional) how long to wait for responses in ms. Default is 1min.

### p = node.send(data)

Send a request to the server. This will set a `reqId` for you and track it. This returns a promise that will resolve when the response is recieved.

### node.ping()

Send a ping to the indy node

### node.close()

This closes the zeromq socket. Any pending requests that have not yet been resolved will be rejected with a `'Closed'` error.

### node.on('error', function(err){})

When an error not tied to any known request occurs.

### node.on('pong', function(){})

When a pong is recieved from the indy node.

### node.on('close', function(){})

When node.close() is called.

## License

MIT
