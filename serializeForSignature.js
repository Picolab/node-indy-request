let crypto = require('crypto')

function serializeForSignatureBase (data, isTopLevel) {
  if (data === true) {
    return 'True'
  } else if (data === false) {
    return 'False'
  } else if (typeof data === 'number') {
    return data + ''
  } else if (typeof data === 'string') {
    return data
  } else if (data === null || data === void 0) {
    return ''
  }
  if (Array.isArray(data)) {
    return data.map(function (value) {
      return serializeForSignatureBase(value, false)
    }).join(',')
  }
  let result = ''
  let inMiddle = false
  Object.keys(data).sort().forEach(function (key) {
    if (isTopLevel && (key === 'fees' || key === 'signature' || key === 'signatures')) {
      return
    }
    if (inMiddle) {
      result += '|'
    }
    let value = data[key]
    if (typeof value === 'string' && (key === 'raw' || key === 'hash' || key === 'enc')) {
      let hash = crypto.createHash('sha256')
      hash.update(value)
      value = hash.digest('hex')
    }
    result = result + key + ':' + serializeForSignatureBase(value, false)
    inMiddle = true
  })
  return result
}

function serializeForSignature (data) {
  return serializeForSignatureBase(data, true)
}

module.exports = serializeForSignature
