const JWT = require('../lib/jwt')
const TokenModel = require('../models/token')
const UserModel = require('../models/user')
const Server = require('../lib/server')

class PaymentPointerController {
  constructor (deps) {
    this.tokens = deps(TokenModel)
    this.users = deps(UserModel)
    this.server = deps(Server)
    this.jwt = deps(JWT)
  }

  async init (router) {
    await this.server.start()

    router.get('/:username', async ctx => {
      if (ctx.get('Accept').indexOf('application/spsp4+json') === -1) {
        return ctx.throw(404)
      }

      const username = ctx.params.username
      let user
      try {
        user = await this.users.get(username)
      } catch (e) {
        ctx.throw(404, 'User not found')
      }

      const { destinationAccount, sharedSecret } =
        this.server.generateAddressAndSecret(username)

      ctx.body = {
        destination_account: destinationAccount,
        shared_secret: sharedSecret.toString('base64'),
        balance: user.balance
      }
      ctx.set('Content-Type', 'application/spsp4+json')
    })

    router.get('/:username/:token', async ctx => {
      if (ctx.get('Accept').indexOf('application/spsp4+json') === -1) {
        return ctx.throw(404)
      }

      const token = ctx.params.token
      let tokenInfo
      try {
        tokenInfo = await this.tokens.get(token)
      } catch (e) {
        tokenInfo = this.jwt.verify({ token })
        if (tokenInfo) {
          tokenInfo.token = token
          await this.tokens.create(tokenInfo)
        } else {
          ctx.throw(404, 'Token not found')
        }
      }

      const { destinationAccount, sharedSecret } =
        this.server.generateAddressAndSecret(`${ctx.params.username}___${ctx.params.token.split('.').join('~')}`)

      ctx.body = {
        destination_account: destinationAccount,
        shared_secret: sharedSecret.toString('base64'),
        pull: {
          balance: {
            total: String(tokenInfo.balanceTotal),
            interval: String(tokenInfo.balanceInterval),
            available: String(tokenInfo.balanceAvailable)
          }
        }
      }
      ctx.set('Content-Type', 'application/spsp4+json')
    })
  }
}

module.exports = PaymentPointerController
