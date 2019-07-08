const fetch = require('node-fetch')

const Config = require('../lib/config')
const TokenModel = require('../models/token')

class Webhooks {
  constructor (deps) {
    this.config = deps(Config)
    this.tokens = deps(TokenModel)
  }

  async call (token) {
    const tokenInfo = await this.tokens.get(token)

    if (!tokenInfo.webhook) {
      return
    }

    return fetch(tokenInfo.webhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + this.config.token
      },
      body: JSON.stringify({
        balanceTotal: tokenInfo.balanceTotal,
        balanceInterval: tokenInfo.balanceTotal,
        pointer: '$' + this.config.host + '/' + token
      })
    })
  }
}

module.exports = Webhooks
