const jwt = require('jsonwebtoken')

const Config = require('./config')
const debug = require('debug')('ilp-spsp-pull:jwt')

class JWT {
  constructor (deps) {
    this.config = deps(Config)
  }

  create ({ payload, options }) {
    debug('Creating token')
    options = addAlgorithm(options)

    return jwt.sign(payload, this.config.jwtSecret, options)
  }

  verify ({ token, options }) {
    debug('Verifying token')
    options = addAlgorithm(options)
    try {
      return jwt.verify(token, this.config.jwtSecret, options)
    } catch (err) {
      return false
    }
  }

  decode (token) {
    debug('Decoding token')
    return jwt.decode(token, { complete: true })
  }
}

function addAlgorithm (options) {
  if (options) {
    options['algorithm'] = 'HS256'
  } else {
    options = { algorithm: 'HS256' }
  }
  return options
}

module.exports = JWT
