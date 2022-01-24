import $u from './utils'
import * as fs from 'fs'

console.log('START');
(async () => {
  const symbol = 'USDT-BTC'
  const countCandels = 1000
  const countCandelsReq = 39
  const tf = 60

  let candels = await $u.getCandels('binance', symbol, countCandels, tf) //  баржа, пара, период, TF в минутах
  let c = 1
  let pred = -1
  while (c++ < countCandelsReq && candels[0]?.open_time !== pred) {
    pred = candels[0]?.open_time || -1
    candels = (await $u.getCandels('binance', symbol, countCandels, tf, candels[0].open_time * 1000)).concat(candels)
    console.log(c, 'End:', candels.length, candels[0].open_time === pred)
  }
  fs.writeFileSync('./' + symbol + '_' + tf + '.json', JSON.stringify(candels))
})()