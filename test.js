let test = require('ava')
let IndyReq = require('./')
let bs58 = require('bs58')
let sodium = require('libsodium-wrappers')
let serializeForSignature = require('./serializeForSignature')

let SERVERKEY = bs58.decode('HXrfcFWDjWusENBoXhV8mARzq51f1npWYWaA1GzfeMDG')

test.cb('ping', function (t) {
  let node = IndyReq({
    host: '127.0.0.1',
    port: 9702,
    serverKey: SERVERKEY
  })

  t.plan(2)

  node.on('error', t.fail)
  node.on('pong', function () {
    t.pass('got pong')
    node.close()
  })
  node.on('close', function () {
    t.pass('got close')
    t.end()
  })

  node.ping()
})

test.cb('close', function (t) {
  let node = IndyReq({
    host: '127.0.0.1',
    port: 9702,
    serverKey: SERVERKEY
  })

  t.plan(2)

  node.on('close', function () {
    t.pass('close')
  })
  node.send({})
    .catch(function (err) {
      t.is(err.message, 'Closed')
      t.end()
    })
  node.close()
})

test('send', async function (t) {
  let node = IndyReq({
    host: '127.0.0.1',
    port: 9702,
    serverKey: SERVERKEY
  })
  node.on('error', t.fail)

  let resp = await node.send({
    operation: {
      type: IndyReq.type.GET_TXN,
      ledgerId: 1,
      data: 9
    },
    identifier: 'MSjKTWkPLtYoPEaTF1TUDb',
    protocolVersion: 2
  })
  t.is(resp.op, 'REPLY')
  t.is(resp.result.seqNo, 9)

  node.close()
})

test('serializeForSignature', async function (t) {
  t.is(serializeForSignature({
    name: 'John Doe',
    age: 43,
    operation: {
      hash: 'cool hash',
      dest: 54
    },
    phones: [
      '1234567',
      '2345678',
      { rust: 5, age: 1 },
      3
    ]
  }), 'age:43|name:John Doe|operation:dest:54|hash:46aa0c92129b33ee72ee1478d2ae62fa6e756869dedc6c858af3214a6fcf1904|phones:1234567,2345678,age:1|rust:5,3')

  t.is(serializeForSignature({
    name: 'John Doe',
    age: 43,
    operation: {
      hash: 'cool hash',
      dest: 54
    },
    fees: 'fees1',
    signature: 'sign1',
    signatures: 'sign-m',
    phones: [
      '1234567',
      '2345678',
      { rust: 5, age: 1 },
      3
    ]
  }), 'age:43|name:John Doe|operation:dest:54|hash:46aa0c92129b33ee72ee1478d2ae62fa6e756869dedc6c858af3214a6fcf1904|phones:1234567,2345678,age:1|rust:5,3')

  t.is(serializeForSignature({
    name: 'John Doe',
    age: 43,
    operation: {
      hash: 'cool hash',
      dest: 54,
      raw: 'string for hash'
    },
    phones: [
      '1234567',
      '2345678',
      { rust: 5, age: 1 },
      3
    ]
  }), 'age:43|name:John Doe|operation:dest:54|hash:46aa0c92129b33ee72ee1478d2ae62fa6e756869dedc6c858af3214a6fcf1904|raw:1dcd0759ce38f57049344a6b3c5fc18144fca1724713090c2ceeffa788c02711|phones:1234567,2345678,age:1|rust:5,3')

  t.is(serializeForSignature({ signature: null }), '')
})

test('NYM + GET_NYM + ATTRIB + GET_ATTR', async function (t) {
  let node = IndyReq({
    host: '127.0.0.1',
    port: 9702,
    serverKey: SERVERKEY
  })
  node.on('error', function (err) {
    t.fail('got error: ' + err)
    node.close()
  })

  await sodium.ready
  let my1 = sodium.crypto_sign_seed_keypair(Buffer.from('00000000000000000000000000000My1', 'utf8'))
  let sender = sodium.crypto_sign_seed_keypair(Buffer.from('000000000000000000000000Trustee1', 'utf8'))

  let my1DID = bs58.encode(Buffer.from(my1.publicKey.slice(0, 16)))
  let my1Verkey = bs58.encode(Buffer.from(my1.publicKey))
  let senderDID = bs58.encode(Buffer.from(sender.publicKey.slice(0, 16)))

  let resp = await node.send({
    operation: {
      type: IndyReq.type.NYM,
      dest: my1DID,
      verkey: my1Verkey
    },
    identifier: senderDID,
    protocolVersion: 2
  }, sender.privateKey)

  t.is(resp.op, 'REPLY')
  t.is(resp.result.txn.data.verkey, my1Verkey)

  resp = await node.send({
    operation: {
      type: IndyReq.type.GET_NYM,
      dest: my1DID
    },
    identifier: senderDID,
    protocolVersion: 2
  })

  t.is(resp.result.dest, my1DID)
  t.is(JSON.parse(resp.result.data).dest, my1DID)
  t.is(JSON.parse(resp.result.data).verkey, my1Verkey)

  resp = await node.send({
    operation: {
      type: IndyReq.type.ATTRIB,
      dest: my1DID,
      raw: '{"some":"one"}'
    },
    identifier: my1DID,
    protocolVersion: 2
  }, my1.privateKey)

  t.is(resp.result.txn.data.raw, '{"some":"one"}')

  resp = await node.send({
    operation: {
      type: IndyReq.type.ATTRIB,
      dest: my1DID,
      raw: '{"another":"thing"}'
    },
    identifier: my1DID,
    protocolVersion: 2
  }, my1.privateKey)

  t.is(resp.result.txn.data.raw, '{"another":"thing"}')

  resp = await node.send({
    operation: {
      type: IndyReq.type.GET_ATTR,
      dest: my1DID,
      raw: 'some'
    },
    identifier: my1DID,
    protocolVersion: 2
  })

  t.is(resp.result.data, '{"some":"one"}')

  resp = await node.send({
    operation: {
      type: IndyReq.type.GET_ATTR,
      dest: my1DID,
      raw: 'another'
    },
    identifier: my1DID,
    protocolVersion: 2
  })

  t.is(resp.result.data, '{"another":"thing"}')

  resp = await node.send({
    operation: {
      type: IndyReq.type.NYM,
      dest: my1DID,
      verkey: my1Verkey
    },
    identifier: my1DID,
    protocolVersion: 2
  }, my1.privateKey)

  resp = await node.send({
    operation: {
      type: IndyReq.type.ATTRIB,
      dest: my1DID,
      raw: '{"some":"one"}'
    },
    identifier: my1DID,
    protocolVersion: 2
  }, my1.privateKey)

  t.is(resp.result.txn.data.raw, '{"some":"one"}')

  resp = await node.send({
    operation: {
      type: IndyReq.type.ATTRIB,
      dest: my1DID,
      raw: '{"another":"thing"}'
    },
    identifier: my1DID,
    protocolVersion: 2
  }, my1.privateKey)

  t.is(resp.result.txn.data.raw, '{"another":"thing"}')

  resp = await node.send({
    operation: {
      type: IndyReq.type.GET_ATTR,
      dest: my1DID,
      raw: 'some'
    },
    identifier: my1DID,
    protocolVersion: 2
  })

  t.is(resp.result.data, '{"some":"one"}')

  resp = await node.send({
    operation: {
      type: IndyReq.type.GET_ATTR,
      dest: my1DID,
      raw: 'another'
    },
    identifier: my1DID,
    protocolVersion: 2
  })

  t.is(resp.result.data, '{"another":"thing"}')

  node.close()
})

test.cb('genesisTxn', function (t) {
  let node = IndyReq({
    genesisTxn: '{"reqSignature":{},"txn":{"data":{"data":{"alias":"Node1","blskey":"4N8aUNHSgjQVgkpm8nhNEfDf6txHznoYREg9kirmJrkivgL4oSEimFF6nsQ6M41QvhM2Z33nves5vfSn9n1UwNFJBYtWVnHYMATn76vLuL3zU88KyeAYcHfsih3He6UHcXDxcaecHVz6jhCYz1P2UZn2bDVruL5wXpehgBfBaLKm3Ba","blskey_pop":"RahHYiCvoNCtPTrVtP7nMC5eTYrsUA8WjXbdhNc8debh1agE9bGiJxWBXYNFbnJXoXhWFMvyqhqhRoq737YQemH5ik9oL7R4NTTCz2LEZhkgLJzB3QRQqJyBNyv7acbdHrAT8nQ9UkLbaVL9NBpnWXBTw4LEMePaSHEw66RzPNdAX1","client_ip":"127.0.0.1","client_port":9702,"node_ip":"127.0.0.1","node_port":9701,"services":["VALIDATOR"]},"dest":"Gw6pDLhcBcoQesN72qfotTgFa7cbuqZpkX3Xo6pLhPhv"},"metadata":{"from":"Th7MpTaRZVRYnPiabds81Y"},"type":"0"},"txnMetadata":{"seqNo":1,"txnId":"fea82e10e894419fe2bea7d96296a6d46f50f93f9eeda954ec461b2ed2950b62"},"ver":"1"}'
  })

  t.plan(2)

  node.on('error', t.fail)
  node.on('pong', function () {
    t.pass('got pong')
    node.close()
  })
  node.on('close', function () {
    t.pass('got close')
    t.end()
  })

  node.ping()
})
