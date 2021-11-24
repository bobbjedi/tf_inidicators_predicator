import $u, { Candel } from './utils'
import * as ind from '@debut/indicators'
export default (candels: Candel[], period: number) => {
  return prepChanges(candels, period)
}

const prepSma = (candels: Candel[], period: number) => {
  const sma = new ind.WEMA(period / 2)
  return $u.normalizeArr(candels.map(c => sma.nextValue(c.close)).filter(v => v))
}

const prepChanges = (candels: Candel[], period: number) => {
  const change1 = $u.mathChangedLast2Candels($u.resizeCandels(candels, 2), 1)
  const change2 = $u.mathChangedLast2Candels($u.resizeCandels(candels, 4), 1)
  const change3 = $u.mathChangedLast2Candels($u.resizeCandels(candels, 6), 1)
  const change4 = $u.mathChangedLast2Candels($u.resizeCandels(candels, 8), 1)
  const change5 = $u.mathChangedLast2Candels($u.resizeCandels(candels, 10), 1)
  const change6 = $u.mathChangedLast2Candels($u.resizeCandels(candels, 12), 1)
  const change7 = $u.mathChangedLast2Candels($u.resizeCandels(candels, 14), 1)
  const change8 = $u.mathChangedLast2Candels($u.resizeCandels(candels, 16), 1)
  const change9 = $u.mathChangedLast2Candels($u.resizeCandels(candels, 18), 1)
  // const change10 = $u.mathChangedLast2Candels($u.resizeCandels(candels, 20), 1)
  const data = [change1, change2, change3, change4, change5, change6, change7, change8, change9]

  const maxV = Math.max(...data.map(v => v.volume))
  const minV = Math.min(...data.map(v => v.volume))

  const maxP = Math.max(...data.map(v => v.price))
  const minP = Math.min(...data.map(v => v.price))

  return data.map(c => [$u.normalise(c.price, maxP, minP), $u.normalise(c.volume, maxV, minV)])
}
// const sma = new SMA(4) // Create SMA with 4 period
// sma.nextValue(1); // undefiend
// sma.nextValue(2); // undefiend
// sma.nextValue(3); // undefiend
// sma.nextValue(4); // 2.50