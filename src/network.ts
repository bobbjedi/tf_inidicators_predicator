import * as tf from '@tensorflow/tfjs'
import * as _ from 'underscore'
import $u from './utils'

export const trainNet = async ({ symbol, tf, countCandels, testCount, callback }: { symbol: string; tf: number, countCandels: number, testCount: number, callback?: (a: Log) => void }) => {
  callback = callback || console.log
  let candels = await $u.getCandels('binance', symbol, countCandels, tf) //  баржа, пара, период, TF в минутах
  let i = 1
  while (i++ < 10) {
    console.log('End:', candels[0].open_time)
    candels = (await $u.getCandels('binance', symbol, countCandels, tf, candels[0].open_time * 1000)).concat(candels)
  }

  const { set, lastInput } = $u.prepSet(candels)
  const trainingData = _.shuffle(set.slice(0, set.length - testCount).map(s => s.set))

  const net = perceptronFromTFJS([32])
  await net.trainNet({ data: trainingData, callback, epochs: 30 })
  console.log('net:', net)
  return { net, set, lastInput }
}

export type Log = { iterations: number, error: number}

const perceptronFromTFJS = (hiddenLayers: number[], activation: any = 'relu') => {
  const model = tf.sequential()
  return {
    async trainNet (opt: {data: {input:number[], output: number[]}[], callback: (d: Log)=> void, epochs: number}) {

      const neurons = [opt.data[0].input.length].concat(hiddenLayers, [opt.data[0].output.length])
      const layers = neurons.map((count, i) => {
        return { inputShape: [count], units: neurons[i + 1], activation }
      }).filter(l => l.units)
      console.log({ neurons, layers })
      layers.forEach(l => model.add(tf.layers.dense(l)))
      model.compile({ optimizer: tf.train.adadelta(0.01), loss: 'meanSquaredError' })
      console.log(model.layers)

      const x = tf.tensor2d(opt.data.map(s => s.input))
      const y = tf.tensor2d(opt.data.map(s => s.output))
      await model.fit(x, y, {
        epochs: opt.epochs,
        callbacks: {
          onEpochEnd (epoch, log) {
            epoch > 3 && opt.callback({ error: log.loss, iterations: epoch })
          }
        }
      })
    },
    run (input: number[]): number[] {
      return (model.predict(tf.tensor2d([input])) as any).arraySync()
    }
  }
  // model.add(tf.layers.dense({ inputShape: [input], units: 10, activation }))
  // model.add(tf.layers.dense({ inputShape: [10], units: 1, activation }))
}