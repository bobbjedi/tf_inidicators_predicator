import * as tf from '@tensorflow/tfjs'
import { input } from '@tensorflow/tfjs'
import * as _ from 'underscore'
import $u from './utils'

export const trainNet = async ({ symbol, tf, countCandels, testCount, callback }: { symbol: string; tf: number, countCandels: number, testCount: number, callback?: (a: Log) => void }) => {
  return
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
    async trainNet (opt: {data: {input:number[], output: number[]}[], callback: (d: Log)=> void, epochs: number, batchSize?:number}) {

      const neurons = [opt.data[0].input.length].concat(hiddenLayers, [opt.data[0].output.length])
      const layers = neurons.map((count, i) => {
        return { inputShape: [count], units: neurons[i + 1], activation }
      }).filter(l => l.units)
      console.log({ neurons, layers })
      layers.forEach(l => model.add(tf.layers.dense(l)))
      model.compile({ optimizer: tf.train.sgd(0.1), loss: 'meanSquaredError' })
      console.log(model.layers)

      const x = tf.tensor2d(opt.data.map(s => s.input))
      const y = tf.tensor2d(opt.data.map(s => s.output))
      await model.fit(x, y, {
        epochs: opt.epochs,
        batchSize: opt.batchSize,
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

const lstm = (inputExample: number[][]) => {
  const inputShape = tf.tensor2d(inputExample).shape
  // const outputShape = tf.tensor1d(inputExample[0]).shape
  console.log({ inputShape })
  // console.log('input shape', inputShape)
  const model = tf.sequential()
  model.add(tf.layers.lstm({ inputShape, units: 64, returnSequences: true }))
  // model.add(tf.layers.dropout({ rate: 0.2 }))
  model.add(tf.layers.lstm({ units: 64, activation: 'relu' }))
  // model.add(tf.layers.dropout({ rate: 0.2 }))
  model.add(tf.layers.dense({ units: inputExample[0].length, activation: 'relu' }))
  model.compile({ optimizer: tf.train.adam(0.1), loss: 'meanSquaredError' })
  return model
  // model.add(input)
  // model.add(denseLayer1)
  // model.add(denseLayer2)
  // model.add(tf.layers.flatten())
  // model.add(outputLayer)
}

setTimeout(async () => {
  const setdata = _.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]).map(e => e / 15)
  const set = $u.separateArr($u.separateArr(setdata, 3), 3)
  console.log(set)
  const lstmNet = lstm(set[0])
  console.log(':LL', lstmNet)

  const inputs: number[][][] = []
  const outputs: number[][] = []
  set.forEach((input, i) => {
    if (!set[i + 1]) {
      return
    }
    inputs.push(input)
    outputs.push(set[i + 1][2])
  })
  const x = tf.tensor3d(inputs)
  const y = tf.tensor2d(outputs)
  await lstmNet.fit(x, y, {
    epochs: 100,
    // batchSize: 1,
    callbacks: {
      onEpochEnd (epoch, log) {
        epoch > 3 && console.log(epoch, log)
      }
    }
  })
  inputs.forEach((input, i) => {
    const predict = (lstmNet.predict(tf.tensor3d([input])) as any).arraySync()[0] as number[]
    console.log(input, predict.map(e => +(e * 15).toFixed(1)), outputs[i].map(e => e * 15))
  })
}, 1000)
// const dataEl = opt.data[0]
// const inputShape = tf.tensor2d(dataEl.input).shape
// console.log('input shape', inputShape)
// const input = tf.layers.dense({ inputShape, units: 32 })
// const denseLayer1 = tf.layers.dense({ units: 64, activation: 'relu' })
// const denseLayer2 = tf.layers.dense({ units: 128, activation: 'relu' })
// const denseLayer3 = tf.layers.dense({ units: 32, activation: 'relu' })
// const outputLayer = tf.layers.dense({ units: 1, activation: 'relu' })

// model.add(input)
// model.add(denseLayer1)
// model.add(denseLayer2)
// model.add(denseLayer3)
// model.add(tf.layers.flatten())
// model.add(outputLayer)
// // Obtain the output symbolic tensor by applying the layers on the input.
// // const output = denseLayer2.apply(denseLayer1.apply(input))

// // Create the model based on the inputs.
// // const model = tf.sequential({ inputs: input, outputs: output as tf.SymbolicTensor })

// model.compile({ optimizer: tf.train.adadelta(0.01), loss: 'meanSquaredError' })
// console.log(model.layers)
// console.log('i>', opt.data.map(s => s.input))
// const x = tf.tensor3d(opt.data.map(s => s.input))
// const y = tf.tensor2d(opt.data.map(s => s.output))
// await model.fit(x, y, {
//   epochs: opt.epochs,
//   batchSize: opt.batchSize || 12,
//   callbacks: {
//     onEpochEnd (epoch, log) {
//       epoch > 3 && opt.callback({ error: log.loss, iterations: epoch })
//     }
//   }
// })
// },
// run (input: number[][]): number[] {
// return (model.predict(tf.tensor3d([input])) as any).arraySync()
// }
// }