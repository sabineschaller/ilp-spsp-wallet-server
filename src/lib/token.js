const BigNumber = require('bignumber.js')
const moment = require('moment')

const Exchange = require('ilp-exchange-rate')

class Token {
  pull (tokenInfo, amount) {
    tokenInfo.balanceTotal = new BigNumber(tokenInfo.balanceTotal).plus(amount)
    tokenInfo.balanceInterval = new BigNumber(tokenInfo.balanceInterval).plus(amount)
    return tokenInfo
  }

  get (tokenInfo) {
    const cycleCurrent = Math.ceil((moment(moment().toISOString()) - moment(tokenInfo.start)) / moment.duration(tokenInfo.interval))
    if (tokenInfo.cycleCurrent < cycleCurrent) {
      tokenInfo.cycleCurrent = cycleCurrent
      tokenInfo.balanceInterval = String(0)
    }
    tokenInfo.balanceAvailable = String(this.availableFunds(tokenInfo))
    return tokenInfo
  }

  async update (tokenInfo, values) {
    if (values.assetCode && values.assetScale) {
      const exchangeRate = await Exchange.fetchRate(tokenInfo.assetCode, tokenInfo.assetScale, values.assetCode, values.assetScale)
      tokenInfo.amount = String(Math.floor(new BigNumber(tokenInfo.amount).multipliedBy(exchangeRate)))
      tokenInfo.balanceTotal = String(Math.floor(new BigNumber(tokenInfo.balanceTotal).multipliedBy(exchangeRate)))
      tokenInfo.balanceInterval = String(Math.floor(new BigNumber(tokenInfo.balanceInterval).multipliedBy(exchangeRate)))
      tokenInfo.balanceAvailable = String(Math.floor(new BigNumber(tokenInfo.balanceAvailable).multipliedBy(exchangeRate)))
      tokenInfo.assetCode = values.assetCode
      tokenInfo.assetScale = values.assetScale
    }
    if ((!values.assetCode && values.assetScale) || (values.assetCode && !values.assetScale)) {
      return { 'Error': 'Asset code and scale can only be updated together.' }
    }
    if (values.amount) {
      let difference = new BigNumber(values.amount).minus(BigNumber(tokenInfo.amount))
      tokenInfo.balanceTotal = String(BigNumber.minimum(new BigNumber(tokenInfo.amount).minus(tokenInfo.balanceAvailable), 0))
      tokenInfo.balanceAvailable = String(BigNumber.maximum(new BigNumber(tokenInfo.balanceAvailable).plus(difference), 0))
      tokenInfo.start = moment(moment(tokenInfo.start) + (tokenInfo.cycleCurrent - 1) * moment.duration(tokenInfo.interval)).toISOString()
      tokenInfo.cycles = tokenInfo.cycles - tokenInfo.cycleCurrent + 1
      tokenInfo.cycleCurrent = 1
      tokenInfo.amount = values.amount
    }
    if (values.interval) {
      tokenInfo.balanceTotal = String(new BigNumber(tokenInfo.amount).minus(tokenInfo.balanceAvailable))
      tokenInfo.start = moment(moment(tokenInfo.start) + (tokenInfo.cycleCurrent - 1) * moment.duration(tokenInfo.interval)).toISOString()
      tokenInfo.cycles = tokenInfo.cycles - tokenInfo.cycleCurrent + 1
      tokenInfo.cycleCurrent = 1
      tokenInfo.interval = values.interval
    }
    if (values.cap) {
      tokenInfo.balanceTotal = String(new BigNumber(tokenInfo.amount).minus(tokenInfo.balanceAvailable))
      tokenInfo.start = moment(moment(tokenInfo.start) + (tokenInfo.cycleCurrent - 1) * moment.duration(tokenInfo.interval)).toISOString()
      tokenInfo.cycles = tokenInfo.cycles - tokenInfo.cycleCurrent + 1
      tokenInfo.cycleCurrent = 1
      tokenInfo.cap = values.cap === 'true'
    }
    if (values.cycles) {
      tokenInfo.cycles = Number(values.cycles)
    }
    if (values.expiry) {
      tokenInfo.expiry = moment(values.expiry).toISOString()
    }
    return tokenInfo
  }

  availableFunds (tokenInfo) {
    if (tokenInfo.cap) {
      if (tokenInfo.cycleCurrent <= tokenInfo.cycles) {
        return new BigNumber(tokenInfo.amount).minus(tokenInfo.balanceInterval)
      } else {
        return 0
      }
    } else {
      return new BigNumber(tokenInfo.amount).multipliedBy(BigNumber.minimum(tokenInfo.cycleCurrent, tokenInfo.cycles)).minus(tokenInfo.balanceTotal)
    }
  }
}

module.exports = Token
