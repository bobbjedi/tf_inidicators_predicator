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
  //   const change7 = $u.mathChangedLast2Candels($u.resizeCandels(candels, 14), 1)
  return [change1.price, change2.price, change3.price, change4.price, change5.price, change6.price]
}
// const sma = new SMA(4) // Create SMA with 4 period
// sma.nextValue(1); // undefiend
// sma.nextValue(2); // undefiend
// sma.nextValue(3); // undefiend
// sma.nextValue(4); // 2.50