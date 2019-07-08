const UserModel = require('../models/user')
const Auth = require('../lib/auth')
const debug = require('debug')('ilp-spsp-pull:user-controller')

class UserController {
  constructor (deps) {
    this.users = deps(UserModel)
    this.auth = deps(Auth)
  }

  async init (router) {
    router.post('/', this.auth.getMiddleware(), async ctx => {
      debug('creating user pointer')
      const { username } = ctx.request.body
      const { pointer, error } = await this.users.create({ username })
      if (pointer) {
        ctx.body = { pointer }
      } else {
        ctx.throw(409, error)
      }
    })
  }
}

module.exports = UserController
