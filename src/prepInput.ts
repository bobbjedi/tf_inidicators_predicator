import $u, { Candel } from './utils'
import * as ind from '@debut/indicators'
export default (candels: Candel[], period: number, priceDemec: number) => {
  return prepChanges(candels, period, priceDemec)
}

const prepSma = (candels: Candel[], period: number) => {
  const sma = new ind.WEMA(period / 2)
  return $u.normalizeArr(candels.map(c => sma.nextValue(c.close)).filter(v => v))
}

const prepChanges = (candels: Candel[], period: number, priceDemec: number) => {
  // const priceDemec = 8
  const change1 = $u.mathChangedLast2Candels($u.resizeCandels(candels, 2), 1)
  const change2 = $u.mathChangedLast2Candels($u.resizeCandels(candels, 4), 1)
  const change3 = $u.mathChangedLast2Candels($u.resizeCandels(candels, 6), 1)
  const change4 = $u.mathChangedLast2Candels($u.resizeCandels(candels, 8), 1)
  const change5 = $u.mathChangedLast2Candels($u.resizeCandels(candels, 10), 1)
  const change6 = $u.mathChangedLast2Candels($u.resizeCandels(candels, 12), 1)
  const change7 = $u.mathChangedLast2Candels($u.resizeCandels(candels, 14), 1)
  return [
    $u.normalise(change1.price, -priceDemec, priceDemec),
    $u.normalise(change2.price, -priceDemec, priceDemec),
    $u.normalise(change3.price, -priceDemec, priceDemec),
    $u.normalise(change4.price, -priceDemec, priceDemec),
    $u.normalise(change5.price, -priceDemec, priceDemec),
    $u.normalise(change6.price, -priceDemec, priceDemec),
    $u.normalise(change7.price, -priceDemec, priceDemec),

    $u.normalise(change1.volume, -100, 100),
    $u.normalise(change2.volume, -100, 100),
    $u.normalise(change3.volume, -100, 100),
    $u.normalise(change4.volume, -100, 100),
    $u.normalise(change5.volume, -100, 100),
    $u.normalise(change6.volume, -100, 100),
    $u.normalise(change7.volume, -100, 100)
  ]
  // return [change1.price, change2.price, change3.price, change4.price, change5.price, change6.price]
}
// const sma = new SMA(4) // Create SMA with 4 period
// sma.nextValue(1); // undefiend
// sma.nextValue(2); // undefiend
// sma.nextValue(3); // undefiend
// sma.nextValue(4); // 2.50