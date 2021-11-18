import * as tf from '@tensorflow/tfjs'
import * as _ from 'underscore'
import $u from './utils'

export const trainNet = async ({ symbol, tf, countCandels, testCount, callback }: { symbol: string; tf: number, countCandels: number, testCount: number, callback?: (a: Log) => void }) => {
  callback = callback || console.log
  let candels = await $u.getCandels('binance', symbol, countCandels, tf) //  баржа, пара, период, TF в минутах
  let i = 1
  while (i++ < 2) {
    console.log('End:', candels[0].open_time)
    candels = (await $u.getCandels('binance', symbol, countCandels, tf, candels[0].open_time * 1000)).concat(candels)
  }

  const { set, lastInput } = $u.prepSet(candels)
  const trainingData = _.shuffle(set.slice(0, set.length - testCount).map(s => s.set))

  const net = perceptronFromTFJS(trainingData[0].input.length, trainingData[0].output.length, [32, 16])
  await net.trainNet({ data: trainingData, callback, epochs: 30 })
  console.log('net:', net)
  return { net, set, lastInput }
}

export type Log = { iterations: number, error: number}

const perceptronFromTFJS = (input: number, output: number, hiddenLayers: number[], activation: any = 'relu') => {
  const model = tf.sequential()
  model.add(tf.layers.dense({ inputShape: [input], units: hiddenLayers[0], activation }))
  hiddenLayers.forEach((l, i) => model.add(tf.layers.dense({ inputShape: [l], units: hiddenLayers[i + 1] || output, activation })))
  model.compile({ optimizer: tf.train.adadelta(0.01), loss: 'meanSquaredError' })
  return {
    async trainNet (opt: {data: {input:number[], output: number[]}[], callback: (d: Log)=> void, epochs: number}) {
      const x = tf.tensor2d(opt.data.map(s => s.input))
      const y = tf.tensor2d(opt.data.map(s => s.output))
      for (let i = 1; i < 3; ++i) {
        var h = await model.fit(x, y, { epochs: opt.epochs })
        console.log('Loss after Epoch ' + i + ' : ' + h.history.loss[0])
        opt.callback({ error: +h.history.loss[0], iterations: +h.epoch[0] })
      }
    },
    run (input: number[]): number[] {
      return (model.predict(tf.tensor2d([input])) as any).arraySync()
    }
  }
  // model.add(tf.layers.dense({ inputShape: [input], units: 10, activation }))
  // model.add(tf.layers.dense({ inputShape: [10], units: 1, activation }))
}