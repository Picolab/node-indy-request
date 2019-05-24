const IndyReq = require('indy-request')
const bs58 = require('bs58')
const nacl = require('tweetnacl')
const util = require('util')

async function main() {
    let dockerNode = IndyReq({
        // localPool, first line of the docker pool genesis file with client_ip set to 127.0.0.1
        genesisTxn: '{"reqSignature":{},"txn":{"data":{"data":{"alias":"Node1","blskey":"4N8aUNHSgjQVgkpm8nhNEfDf6txHznoYREg9kirmJrkivgL4oSEimFF6nsQ6M41QvhM2Z33nves5vfSn9n1UwNFJBYtWVnHYMATn76vLuL3zU88KyeAYcHfsih3He6UHcXDxcaecHVz6jhCYz1P2UZn2bDVruL5wXpehgBfBaLKm3Ba","blskey_pop":"RahHYiCvoNCtPTrVtP7nMC5eTYrsUA8WjXbdhNc8debh1agE9bGiJxWBXYNFbnJXoXhWFMvyqhqhRoq737YQemH5ik9oL7R4NTTCz2LEZhkgLJzB3QRQqJyBNyv7acbdHrAT8nQ9UkLbaVL9NBpnWXBTw4LEMePaSHEw66RzPNdAX1","client_ip":"127.0.0.1","client_port":9702,"node_ip":"127.0.0.1","node_port":9701,"services":["VALIDATOR"]},"dest":"Gw6pDLhcBcoQesN72qfotTgFa7cbuqZpkX3Xo6pLhPhv"},"metadata":{"from":"Th7MpTaRZVRYnPiabds81Y"},"type":"0"},"txnMetadata":{"seqNo":1,"txnId":"fea82e10e894419fe2bea7d96296a6d46f50f93f9eeda954ec461b2ed2950b62"},"ver":"1"}'
    })

    dockerNode.on('error', function (err) {
        console.error('got error', err)
    })
    dockerNode.on('pong', function () {
        console.log('got pong')
    })
    dockerNode.on('close', function () {
        console.log('got close')
    })

    // generate key pair
    let my1      = nacl.sign.keyPair.fromSeed(Buffer.from('00000000000000000000000000000My1', 'utf8'))
    let trustee1 = nacl.sign.keyPair.fromSeed(Buffer.from('000000000000000000000000Trustee1', 'utf8'))
    // create did from public key
    let my1DID      = bs58.encode(Buffer.from(my1.publicKey.slice(0, 16)))
    let my1Verkey   = bs58.encode(Buffer.from(my1.publicKey))
    let trustee1DID = bs58.encode(Buffer.from(trustee1.publicKey.slice(0, 16)))

    // anchor nym to ledger with trustee role
    console.log('Anchor NYM')
    data = {
        operation: {
            type: IndyReq.type.NYM,
            dest: my1DID,
            role: IndyReq.role.TRUSTEE,
            verkey: my1Verkey
        },
        identifier: trustee1DID,
        protocolVersion: 2
    }
  
    let resp = await dockerNode.send(data, trustee1.secretKey)

    console.log('NYM resp:')
    console.log(util.inspect(resp, false, null, true))

    dockerNode.close()
}
main().catch(console.error)
