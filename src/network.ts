const convnetjs = require('convnetjs')
console.log({ convnetjs })
import * as _ from 'underscore'
import $u from './utils'

export const trainNet = async ({ symbol, tf, countCandels, testCount, callback }: { symbol: string; tf: number, countCandels: number, testCount: number, callback?: (a: Log) => void }) => {
  callback = callback || console.log
  let candels = await $u.getCandels('binance', symbol, countCandels, tf) //  баржа, пара, период, TF в минутах
  let i = 1
  while (i++ < 3) {
    console.log('End:', candels[0].open_time)
    candels = (await $u.getCandels('binance', symbol, countCandels, tf, candels[0].open_time * 1000)).concat(candels)
  }

  const { set, lastInput } = $u.prepSet(candels)
  const trainingData = _.shuffle(set.slice(0, set.length - testCount).map(s => s.set))
  const layer_defs = []
  layer_defs.push({ type: 'input', out_sx: 1, out_sy: 1, out_depth: trainingData[0].input.length })
  layer_defs.push({ type: 'fc', num_neurons: 12, activation: 'relu' })
  layer_defs.push({ type: 'regression', num_neurons: 1 })
  const net = new convnetjs.Net()
  console.log('layer_defs', layer_defs)
  net.makeLayers(layer_defs)

  const dataAsVols = trainingData.map(s => {
    return {
      x: new convnetjs.Vol(s.input),
      y: s.output
    }
  })

  var trainer = new convnetjs.Trainer(net, { method: 'adadelta', l2_decay: 0.001, batch_size: 10 })
  let i_ = 0
  while (i_++ < 1000) {
    let stats: any = {}
    await $u.wait(0)
    _.shuffle(dataAsVols).forEach(({ x, y }) => stats = trainer.train(x, y))
    if (i_ % 10 === 0) {
      console.log(stats)
      callback({ iterations: i_, error: stats.loss })
    }
  }

  // evaluate on a datapoint. We will get a 1x1x1 Vol back, so we get the
  // actual output by looking into its 'w' field:
  // var predicted_values = net.forward(x)
  // console.log('predicted value: ' + predicted_values.w[0])
  // console.log('stats:', stats)
  net.run = (x: number[]) => net.forward(new convnetjs.Vol(x)).w
  console.log('net:', net)
  return { net, set, lastInput }
}

export type Log = { iterations: number, error: number}