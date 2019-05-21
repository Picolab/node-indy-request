# indy-request

[![build status](https://secure.travis-ci.org/Picolab/node-indy-request.svg)](https://travis-ci.org/Picolab/node-indy-request)

Make requests to Indy (i.e. Sovrin) nodes using node.js

```js
let IndyReq = require('indy-request')

let node = IndyReq({
  genesisTxn: '{"reqSignature":{},"txn":{"data":{"data":{"alias":"Node1","blskey":"4N8aUNHSgjQVgkpm8nhNEfDf6txHznoYREg9kirmJrkivgL4oSEimFF6nsQ6M41QvhM2Z33nves5vfSn9n1UwNFJBYtWVnHYMATn76vLuL3zU88KyeAYcHfsih3He6UHcXDxcaecHVz6jhCYz1P2UZn2bDVruL5wXpehgBfBaLKm3Ba","blskey_pop":"RahHYiCvoNCtPTrVtP7nMC5eTYrsUA8WjXbdhNc8debh1agE9bGiJxWBXYNFbnJXoXhWFMvyqhqhRoq737YQemH5ik9oL7R4NTTCz2LEZhkgLJzB3QRQqJyBNyv7acbdHrAT8nQ9UkLbaVL9NBpnWXBTw4LEMePaSHEw66RzPNdAX1","client_ip":"127.0.0.1","client_port":9702,"node_ip":"127.0.0.1","node_port":9701,"services":["VALIDATOR"]},"dest":"Gw6pDLhcBcoQesN72qfotTgFa7cbuqZpkX3Xo6pLhPhv"},"metadata":{"from":"Th7MpTaRZVRYnPiabds81Y"},"type":"0"},"txnMetadata":{"seqNo":1,"txnId":"fea82e10e894419fe2bea7d96296a6d46f50f93f9eeda954ec461b2ed2950b62"},"ver":"1"}'
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
* `conf.genesisTxn` instead of host+port+serverKey you can simply pass a line from the genesis transaction to the node you wish to connect to.

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
