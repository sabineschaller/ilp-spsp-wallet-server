const Koa = require('koa')
const Router = require('koa-router')
const BodyParser = require('koa-bodyparser')

const Config = require('./lib/config')
const Localtunnel = require('./lib/localtunnel')
const UserController = require('./controllers/user')
const TokenController = require('./controllers/token')
const PaymentPointerController = require('./controllers/payment-pointer')
const ExchangeController = require('./controllers/exchange')

class App {
  constructor (deps) {
    this.config = deps(Config)
    this.koa = deps(Koa)
    this.router = deps(Router)
    this.localtunnel = deps(Localtunnel)

    this.paymentPointer = deps(PaymentPointerController)
    this.users = deps(UserController)
    this.tokens = deps(TokenController)
    this.exchange = deps(ExchangeController)
  }

  async listen () {
    const app = this.koa
    const router = this.router
    const { port, localtunnel } = this.config

    if (localtunnel) {
      await this.localtunnel.listen()
    }

    await this.exchange.init(router)
    await this.paymentPointer.init(router)
    await this.users.init(router)
    await this.tokens.init(router)

    app.use(BodyParser())
    app.use(router.routes())
    app.use(router.allowedMethods())
    app.listen(port)
  }
}

module.exports = App
