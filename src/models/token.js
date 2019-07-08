const levelup = require('levelup')
const leveldown = require('leveldown')
const memdown = require('memdown')
const moment = require('moment')
const uuid = require('uuid')

const Config = require('../lib/config')
const Token = require('../lib/token')
const debug = require('debug')('ilp-spsp-pull:token-model')

class TokenModel {
  constructor (deps) {
    this.config = deps(Config)
    this.token = deps(Token)
    this.db = levelup(this.config.dbPath
      ? leveldown(this.config.dbPath)
      : memdown())
    this.expiryCache = new Map()
  }

  async pull ({ token, amount }) {
    let tokenInfo = await this.get(token)
    tokenInfo = this.token.pull(tokenInfo, amount)
    this.db.put(token, JSON.stringify(tokenInfo))
    debug(`Pulled ${amount} from ${token}`)
  }

  async get (token) {
    let tokenInfo = JSON.parse(await this.db.get(token))
    tokenInfo = this.token.get(tokenInfo)
    this.db.put(token, JSON.stringify(tokenInfo))
    debug(`Queried token ${token}`)
    return tokenInfo
  }

  getExpired () {
    const now = new Date()
    return Array.from(this.expiryCache.values())
      .filter(p => {
        return now > new Date(p.expiry)
      })
      .map(p => p.id)
  }

  async deleteMultiple (tokens) {
    await tokens.map(async token => this.delete(token))
  }

  async delete (token) {
    debug(`Deleting token ${token}`)
    this.expiryCache.delete(token)
    await this.db.del(token)
  }

  async create ({ username, token, amount, start, expiry, interval, cycles, cap, assetCode, assetScale, webhook }) {
    if (!token) {
      token = uuid()
    }
    let expiryISO
    if (expiry) {
      expiryISO = moment(expiry).toISOString()
      this.expiryCache.set(token, { id: token, expiry: expiryISO })
    }

    await this.db.put(token, JSON.stringify({
      balanceTotal: String(0),
      balanceInterval: String(0),
      balanceAvailable: String(0),
      amount,
      start: (moment(start) || moment()).toISOString(),
      expiry: expiryISO,
      interval,
      cycles: Number(cycles),
      cycleCurrent: 1,
      cap: cap === 'true',
      assetCode,
      assetScale,
      webhook
    }))
    debug(`Created token ${token}`)

    return {
      token,
      pointer: `$${this.config.host}/${username}/${token}`
    }
  }

  async update (token, values) {
    let tokenInfo = await this.get(token)
    tokenInfo = await this.token.update(tokenInfo, values)
    this.expiryCache.set(token, { id: token, expiry: tokenInfo.expiry })
    this.db.put(token, JSON.stringify(tokenInfo))
    debug(`Updated token ${token}`)
    return tokenInfo
  }
}

module.exports = TokenModel
