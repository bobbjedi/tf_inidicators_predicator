import * as tf from '@tensorflow/tfjs'
import * as _ from 'underscore'
import $u from './utils'

export const trainNet = async ({ symbol, tf, countCandels, testCount, callback }: { symbol: string; tf: number, countCandels: number, testCount: number, callback?: (a: Log) => void }) => {
  callback = callback || console.log
  let candels = await $u.getCandels('binance', symbol, countCandels, tf) //  баржа, пара, период, TF в минутах
  let i = 1
  while (i++ < 15) {
    console.log('End:', candels[0].open_time)
    candels = (await $u.getCandels('binance', symbol, countCandels, tf, candels[0].open_time * 1000)).concat(candels)
  }

  const { set, lastInput } = $u.prepSet(candels)
  const trainingData = _.shuffle(set.slice(0, set.length - testCount).map(s => s.set))
  console.log(trainingData)
  const net = perceptronFromTFJS([64, 128])
  await net.trainNet({ data: trainingData, callback, batchSize: 64, epochs: 30 })
  console.log('net:', net)
  return { net, set, lastInput }
}

export type Log = { iterations: number, error: number}

const perceptronFromTFJS = (hiddenLayers: number[], activation: any = 'relu') => {
  const model = tf.sequential()
  return {
    async trainNet (opt: {data: {input:number[][], output: number[]}[], callback: (d: Log)=> void, epochs: number, batchSize?: number}) {
      const dataEl = opt.data[0]
      const inputShape = tf.tensor2d(dataEl.input).shape
      console.log('input shape', inputShape)
      const input = tf.layers.dense({ inputShape, units: 32 })
      const denseLayer1 = tf.layers.dense({ units: 64, activation: 'relu' })
      const denseLayer2 = tf.layers.dense({ units: 128, activation: 'relu' })
      const denseLayer3 = tf.layers.dense({ units: 32, activation: 'relu' })
      const outputLayer = tf.layers.dense({ units: 1, activation: 'relu' })

      model.add(input)
      model.add(denseLayer1)
      model.add(denseLayer2)
      model.add(denseLayer3)
      model.add(tf.layers.flatten())
      model.add(outputLayer)
      // Obtain the output symbolic tensor by applying the layers on the input.
      // const output = denseLayer2.apply(denseLayer1.apply(input))

      // Create the model based on the inputs.
      // const model = tf.sequential({ inputs: input, outputs: output as tf.SymbolicTensor })

      model.compile({ optimizer: tf.train.adadelta(0.01), loss: 'meanSquaredError' })
      console.log(model.layers)
      console.log('i>', opt.data.map(s => s.input))
      const x = tf.tensor3d(opt.data.map(s => s.input))
      const y = tf.tensor2d(opt.data.map(s => s.output))
      await model.fit(x, y, {
        epochs: opt.epochs,
        batchSize: opt.batchSize || 12,
        callbacks: {
          onEpochEnd (epoch, log) {
            epoch > 3 && opt.callback({ error: log.loss, iterations: epoch })
          }
        }
      })
    },
    run (input: number[][]): number[] {
      return (model.predict(tf.tensor3d([input])) as any).arraySync()
    }
  }
  // model.add(tf.layers.dense({ inputShape: [input], units: 10, activation }))
  // model.add(tf.layers.dense({ inputShape: [10], units: 1, activation }))
}