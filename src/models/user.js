const levelup = require('levelup')
const leveldown = require('leveldown')
const memdown = require('memdown')
const BigNumber = require('bignumber.js')

const Config = require('../lib/config')
const debug = require('debug')('ilp-spsp-pull:user-model')

class UserModel {
  constructor (deps) {
    this.config = deps(Config)
    this.db = levelup(this.config.dbPath
      ? leveldown(this.config.dbPath)
      : memdown())
    this.expiryCache = new Map()
  }

  async get (username) {
    let user = JSON.parse(await this.db.get(username))
    debug(`Queried user ${username}`)
    return user
  }

  async create ({ username }) {
    if (!/^[a-zA-Z0-9]+$/.test(username)) {
      return { error: 'Username must only include the following characters: a-z, A-Z, 0-9.' }
    }
    try {
      let user = await this.get(username)
      if (user) {
        return { error: 'Username already in use.' }
      }
    } catch (e) {
      await this.db.put(username, JSON.stringify({
        balance: String(0)
      }))
      debug(`Created user ${username}`)

      return {
        pointer: '$' + this.config.host + '/' + username
      }
    }
  }

  async push ({ username, amount }) {
    let user = await this.get(username)
    user.balance = new BigNumber(user.balance).plus(amount)
    this.db.put(username, JSON.stringify(user))
    debug(`Pushed ${amount} to ${username}`)
  }

  async pull ({ username, amount }) {
    let user = await this.get(username)
    user.balance = new BigNumber(user.balance).minus(amount)
    this.db.put(username, JSON.stringify(user))
    debug(`Pulled ${amount} from ${username}`)
  }

  async availableFunds ({ username, amount }) {
    let user = await this.get(username)
    debug(`balance: ${user.balance}, amount: ${amount}`)
    if (new BigNumber(user.balance).isLessThan(amount)) {
      return new BigNumber(user.balance)
    } else {
      return new BigNumber(amount)
    }
  }
}

module.exports = UserModel
