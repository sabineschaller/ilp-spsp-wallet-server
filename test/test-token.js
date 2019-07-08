const assert = require('chai').assert
const reduct = require('reduct')
const moment = require('moment')
const BigNumber = require('bignumber.js')
const Token = require('../src/lib/token')
const sinon = require('sinon')
const Exchange = require('ilp-exchange-rate')

var deps
var token
var input
var start
var expectedOutput

function fetchRate () {
  return 2
}

describe('Token', function () {
  beforeEach(function () {
    sinon.stub(Exchange, 'fetchRate').callsFake(fetchRate)
    deps = reduct()
    token = deps(Token)
    start = moment(moment() - moment.duration('P0Y0M0DT0H4M30S')).toISOString()
  })
  afterEach(() => {
    sinon.restore()
  });
  
  describe('.pull()', function () {
    it('should update the balances on pull', function () {
      input = {
        amount: '20000',
        assetCode: 'USD',
        assetScale: '2',
        balanceAvailable: '20000',
        balanceInterval: '0',
        balanceTotal: '0',
        cap: false,
        cycleCurrent: 1,
        cycles: 10,
        interval: 'P0Y0M0DT0H1M',
        start: '2019-02-21T22:57:03.893Z'
      }
      let amount = '300'
      expectedOutput = {
        amount: '20000',
        assetCode: 'USD',
        assetScale: '2',
        balanceAvailable: '20000',
        balanceInterval: new BigNumber(amount),
        balanceTotal: new BigNumber(amount),
        cap: false,
        cycleCurrent: 1,
        cycles: 10,
        interval: 'P0Y0M0DT0H1M',
        start: '2019-02-21T22:57:03.893Z'
      }
      assert(JSON.stringify(token.pull(input, amount)) === JSON.stringify(expectedOutput), 'did not update info correctly')
    })
  })
  describe('.get()', function () {
    beforeEach(function () {
      input = {
        amount: '20000',
        assetCode: 'USD',
        assetScale: '2',
        balanceAvailable: '0',
        balanceInterval: '20000',
        balanceTotal: '20000',
        cap: false,
        cycleCurrent: 1,
        cycles: 10,
        interval: 'P0Y0M0DT0H1M',
        start
      }
      expectedOutput = {
        amount: '20000',
        assetCode: 'USD',
        assetScale: '2',
        balanceAvailable: '0',
        balanceInterval: '20000',
        balanceTotal: '20000',
        cap: false,
        cycleCurrent: 5,
        cycles: 10,
        interval: 'P0Y0M0DT0H1M',
        start
      }
    })
    it('should update the current cycle and balances on get, cap=false', function () {
      expectedOutput.balanceAvailable = '80000'
      expectedOutput.balanceInterval = '0'

      let output = token.get(input)
      assert(JSON.stringify(output) === JSON.stringify(expectedOutput), 'did not update info correctly')
    })
    it('should update the current cycle and balances on get, cap=true', function () {
      input.cap = true
      expectedOutput.balanceAvailable = '20000'
      expectedOutput.balanceInterval = '0'
      expectedOutput.cap = true

      let output = token.get(input)
      assert(JSON.stringify(output) === JSON.stringify(expectedOutput), 'did not update info correctly')
    })
    it('should update the current cycle and balances on get, cap=false, after cycle reset', function () {
      let localStart = moment(moment() - moment.duration('P0Y0M0DT0H1M30S')).toISOString()
      input.balanceAvailable = '40000'
      input.balanceTotal = '-20000'
      input.start = localStart

      expectedOutput.balanceAvailable = '60000'
      expectedOutput.balanceInterval = '0'
      expectedOutput.balanceTotal = '-20000'
      expectedOutput.start = localStart
      expectedOutput.cycleCurrent = 2

      let output = token.get(input)
      assert(JSON.stringify(output) === JSON.stringify(expectedOutput), 'did not update info correctly')
    })
  })
  describe('.update()', function () {
    beforeEach(function () {
      input = {
        amount: '20000',
        assetCode: 'USD',
        assetScale: '2',
        balanceAvailable: '20000',
        balanceInterval: '20000',
        balanceTotal: '80000',
        cap: false,
        cycleCurrent: 5,
        cycles: 10,
        interval: 'P0Y0M0DT0H1M',
        start
      }
      expectedOutput = {
        amount: '20000',
        assetCode: 'USD',
        assetScale: '2',
        balanceAvailable: '20000',
        balanceInterval: '20000',
        balanceTotal: '80000',
        cap: false,
        cycleCurrent: 5,
        cycles: 10,
        interval: 'P0Y0M0DT0H1M',
        start
      }
    })
    it('should update assetCode and assetScale', async function () {
      let values = {
        assetCode: 'EUR',
        assetScale: '2'
      }
      expectedOutput.amount = '40000'
      expectedOutput.assetCode = 'EUR'
      expectedOutput.assetScale = '2'
      expectedOutput.balanceAvailable = '40000'
      expectedOutput.balanceInterval = '40000'
      expectedOutput.balanceTotal = '160000'

      let output = await token.update(input, values)
      assert(JSON.stringify(output) === JSON.stringify(expectedOutput), 'did not update info correctly')
    })
    it('should not let you update just the asset code', async function () {
      let values = {
        assetCode: 'EUR'
      }
      expectedOutput = { 'Error': 'Asset code and scale can only be updated together.' }
      let output = await token.update(input, values)
      assert(JSON.stringify(output) === JSON.stringify(expectedOutput), 'did not update info correctly')
    })
    it('should update the amount', async function () {
      let values = {
        amount: '30000'
      }
      expectedOutput.amount = '30000'
      expectedOutput.balanceAvailable = '30000'
      expectedOutput.balanceTotal = '0'
      expectedOutput.cycleCurrent = 1
      expectedOutput.cycles = 6
      expectedOutput.start = moment(moment(start) + moment.duration('P0Y0M0DT0H4M')).toISOString()

      let output = await token.update(input, values)
      assert(JSON.stringify(output) === JSON.stringify(expectedOutput), 'did not update info correctly')
    })
    it('should update the interval', async function () {
      let values = {
        interval: 'P0Y0M0DT0H2M'
      }
      expectedOutput.balanceTotal = '0'
      expectedOutput.cycleCurrent = 1
      expectedOutput.cycles = 6
      expectedOutput.interval = 'P0Y0M0DT0H2M'
      expectedOutput.start = moment(moment(start) + moment.duration('P0Y0M0DT0H4M')).toISOString()

      let output = await token.update(input, values)
      assert(JSON.stringify(output) === JSON.stringify(expectedOutput), 'did not update info correctly')
    })
    it('should update the cap', async function () {
      let values = {
        cap: 'true'
      }
      expectedOutput.cap = true
      expectedOutput.balanceTotal = '0'
      expectedOutput.cycleCurrent = 1
      expectedOutput.cycles = 6
      expectedOutput.start = moment(moment(start) + moment.duration('P0Y0M0DT0H4M')).toISOString()

      let output = await token.update(input, values)
      assert(JSON.stringify(output) === JSON.stringify(expectedOutput), 'did not update info correctly')
    })
    it('should update the cycles', async function () {
      let values = {
        cycles: '30'
      }
      expectedOutput.cycles = 30

      let output = await token.update(input, values)
      assert(JSON.stringify(output) === JSON.stringify(expectedOutput), 'did not update info correctly')
    })
    it('should update the expiry time', async function () {
      let expiry = moment(moment() + moment.duration('P0Y0M0DT0H20M')).toISOString()
      let values = {
        expiry: expiry
      }
      expectedOutput.expiry = expiry

      let output = await token.update(input, values)
      assert(JSON.stringify(output) === JSON.stringify(expectedOutput), 'did not update info correctly')
    })
    it('should update assetCode, assetScale, and amount', async function () {
      let values = {
        assetCode: 'EUR',
        assetScale: '2',
        amount: '15000'
      }
      expectedOutput.assetCode = 'EUR'
      expectedOutput.assetScale = '2'
      expectedOutput.amount = '15000'
      expectedOutput.balanceAvailable = '15000'
      expectedOutput.balanceInterval = '40000'
      expectedOutput.balanceTotal = '0'
      expectedOutput.cycleCurrent = 1
      expectedOutput.cycles = 6
      expectedOutput.start = moment(moment(start) + moment.duration('P0Y0M0DT0H4M')).toISOString()

      let output = await token.update(input, values)
      assert(JSON.stringify(output) === JSON.stringify(expectedOutput), 'did not update info correctly')
    })
    it('should update assetCode, assetScale, and amount with little leftover', async function () {
      let values = {
        assetCode: 'EUR',
        assetScale: '2',
        amount: '15000'
      }
      input.balanceAvailable = '0'
      input.balanceTotal = '100000'

      expectedOutput.assetCode = 'EUR'
      expectedOutput.assetScale = '2'
      expectedOutput.amount = '15000'
      expectedOutput.balanceAvailable = '0'
      expectedOutput.balanceInterval = '40000'
      expectedOutput.balanceTotal = '0'
      expectedOutput.cycleCurrent = 1
      expectedOutput.cycles = 6
      expectedOutput.start = moment(moment(start) + moment.duration('P0Y0M0DT0H4M')).toISOString()

      let output = await token.update(input, values)
      assert(JSON.stringify(output) === JSON.stringify(expectedOutput), 'did not update info correctly')
    })
    it('should update assetCode, assetScale, and amount with high leftover', async function () {
      let values = {
        assetCode: 'EUR',
        assetScale: '2',
        amount: '15000'
      }
      input.balanceAvailable = '60000'
      input.balanceTotal = '40000'

      expectedOutput.assetCode = 'EUR'
      expectedOutput.assetScale = '2'
      expectedOutput.amount = '15000'
      expectedOutput.balanceAvailable = '95000'
      expectedOutput.balanceInterval = '40000'
      expectedOutput.balanceTotal = '-80000'
      expectedOutput.cycleCurrent = 1
      expectedOutput.cycles = 6
      expectedOutput.start = moment(moment(start) + moment.duration('P0Y0M0DT0H4M')).toISOString()

      let output = await token.update(input, values)
      assert(JSON.stringify(output) === JSON.stringify(expectedOutput), 'did not update info correctly')
    })
  })
})
