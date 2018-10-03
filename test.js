let test = require('ava')
let IndyReq = require('./')
let bs58 = require('bs58')

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
