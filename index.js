let bs58 = require('bs58')
let nacl = require('tweetnacl')
let zmq = require('zeromq')
let EventEmitter = require('events')
let serializeForSignature = require('./serializeForSignature')

const type = {
  NODE: '0',
  NYM: '1',
  ATTRIB: '100',
  SCHEMA: '101',
  CRED_DEF: '102',
  POOL_UPGRADE: '109',
  NODE_UPGRADE: '110',
  POOL_CONFIG: '111',
  GET_TXN: '3',
  GET_ATTR: '104',
  GET_NYM: '105',
  GET_SCHEMA: '107',
  GET_CRED_DEF: '108'
}

const role = {
  TRUSTEE: '0',
  STEWARD: '2',
  TRUST_ANCHOR: '101',
  ROLE_REMOVE: ''
}

function IndyReq (conf) {
  if (typeof conf.timeout !== 'number') {
    conf.timeout = 1000 * 60
  }
  let zsock = zmq.socket('dealer')

  let keypair = zmq.zmqCurveKeypair()
  zsock.identity = keypair.public
  zsock.curve_publickey = keypair.public
  zsock.curve_secretkey = keypair.secret
  zsock.curve_serverkey = conf.serverKey
  zsock.linger = 0 // TODO set correct timeout
  zsock.connect('tcp://' + conf.host + ':' + conf.port)

  let nextReqId = 1
  let reqs = {}

  let api = new EventEmitter()

  zsock.on('message', function (msg) {
    try {
      let str = msg.toString('utf8')
      if (str === 'po') {
        api.emit('pong')
        return
      }
      let data = JSON.parse(str)
      let reqId, err
      switch (data.op) {
        case 'REQACK':
          reqId = data.reqId
          if (reqs[reqId]) {
            reqs[reqId].ack = Date.now()
          }
          break
        case 'REQNACK':
        case 'REJECT':
          reqId = data.reqId
          err = new Error(data.reason)
          err.data = data
          if (reqs[reqId]) {
            reqs[reqId].reject(err)
          } else {
            api.emit('error', err)
          }
          break
        case 'REPLY':
          if (data.result && data.result.txn && data.result.txn.metadata) {
            reqId = data.result.txn.metadata.reqId
          } else {
            reqId = data.result.reqId
          }

          if (reqs[reqId]) {
            reqs[reqId].resolve(data)
            delete reqs[reqId]
          } else {
            let err = new Error('reqId not found: ' + reqId)
            err.data = data
            api.emit('error', err)
          }
          break
        default:
          err = new Error('op not handled: ' + data.op)
          err.data = data
          api.emit('error', err)
      }
    } catch (err) {
      // TODO try MsgPack
      api.emit('error', err)
    }
  })

  let checkTimeouts = setInterval(function () {
    Object.keys(reqs).forEach(function (reqId) {
      if ((Date.now() - reqs[reqId].sent) > conf.timeout) {
        reqs[reqId].reject(new Error('Timeout'))
        delete reqs[reqId]
      }
    })
  }, 1000)

  api.ping = function ping () {
    zsock.send('pi')
  }
  api.send = function send (data, signKey) {
    let reqId = nextReqId++
    data.reqId = reqId

    if (signKey) {
      let serialized = serializeForSignature(data, true)
      data.signature = bs58.encode(Buffer.from(nacl.sign(Buffer.from(serialized, 'utf8'), signKey).slice(0, 64)))
    }

    let p = new Promise(function (resolve, reject) {
      reqs[reqId] = {
        sent: Date.now(),
        ack: null,
        resolve: resolve,
        reject: reject
      }
    })
    let msg = Buffer.from(JSON.stringify(data))
    zsock.send(msg)
    return p
  }
  api.close = function close () {
    zsock.close()
    clearInterval(checkTimeouts)
    Object.keys(reqs).forEach(function (reqId) {
      reqs[reqId].reject(new Error('Closed'))
      delete reqs[reqId]
    })
    api.emit('close')
  }
  return api
}

module.exports = IndyReq
module.exports.type = type
module.exports.role = role
