const TokenModel = require('../models/token')
const UserModel = require('../models/user')
const Auth = require('../lib/auth')
const JWT = require('../lib/jwt')
const Exchange = require('ilp-exchange-rate')
const debug = require('debug')('ilp-spsp-pull:token-controller')

class TokenController {
  constructor (deps) {
    this.users = deps(UserModel)
    this.tokens = deps(TokenModel)
    this.auth = deps(Auth)
    this.jwt = deps(JWT)
  }

  async init (router) {
    router.post('/:user', this.auth.getMiddleware(), async ctx => {
      debug('creating pull token')
      const username = ctx.params.user
      const { amount, start, expiry, interval, cycles, cap, assetCode, assetScale, webhook } = ctx.request.body
      const convertedAsset = await Exchange.convert(amount, assetCode, assetScale)
      let availableFunds = await this.users.availableFunds({ username, amount: convertedAsset.amount })
      if (availableFunds.isGreaterThanOrEqualTo(convertedAsset.amount)) {
        const { pointer } = await this.tokens.create({ username, amount, start, expiry, interval, cycles, cap, assetCode, assetScale, webhook })
        ctx.body = { pointer }
      } else {
        ctx.throw(409, 'User does not have enough funds for the first pull.')
      }
    })

    router.post('/:user/:token', async ctx => {
      debug('creating pull token')
      const username = ctx.params.user
      const token = ctx.params.token
      const tokenInfo = await this.jwt.verify({ token })
      if (tokenInfo) {
        const { pointer } = await this.tokens.create({ username, token, ...tokenInfo })
        ctx.body = { pointer }
      } else {
        ctx.throw(401, 'Unauthorized: Token could not be verified.')
      }
    })

    router.post('/update/:user/:token', this.auth.getMiddleware(), async ctx => {
      debug('updating pull token')
      const updatedInfo = await this.tokens.update(ctx.params.token, ctx.request.body)
      ctx.body = updatedInfo
    })
  }
}

module.exports = TokenController
