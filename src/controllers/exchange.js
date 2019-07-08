const Exchange = require('ilp-exchange-rate')

class ExchangeController {
  async init (router) {
    router.get('/exchange', async ctx => {
      const params = ctx.request.query
      const convertedAsset = await Exchange.convert(params.amount, params.assetCode, params.assetScale)
      ctx.body = convertedAsset
    })
  }
}

module.exports = ExchangeController
