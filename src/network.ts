import * as tf from '@tensorflow/tfjs'
import * as _ from 'underscore'
import prepInput from './prepInput'
import $u, { Candel } from './utils'

export const trainNet = async ({ symbol, tf_, countCandels, testCount, callback }: { symbol: string; tf_: number, countCandels: number, testCount: number, callback?: (a: Log) => void }) => {
  // return
  callback = callback || console.log

  tf_ = 720
  symbol = 'BTC-ETH'
  testCount = 500
  const countCandelsReq = 10
  const period = 10
  const normilizeDemension = 5
  let candels = await $u.getCandels('binance', symbol, countCandels, tf_) //  баржа, пара, период, TF в минутах
  let c = 1
  while (c++ < countCandelsReq) {
    console.log('End:', candels[0].open_time)
    candels = (await $u.getCandels('binance', symbol, countCandels, tf_, candels[0].open_time * 1000)).concat(candels)
  }
  const data = prep3d(candels, { period, normilizeDemension })
  const testData = data.splice(-testCount)
  const x = data.map(d => d.input)
  const y = data.map(d => d.output)
  const lstmNet = lstm(x[5], y[5])

  const xs = tf.tensor2d(x)
  const ys = tf.tensor2d(y)
  await lstmNet.fit(xs, ys, {
    epochs: 20,
    batchSize: 32,
    callbacks: {
      onEpochEnd (epoch, log) {
        console.log(epoch, log)
        callback({ error: log.acc, iterations: epoch })
      }
    }
  })
  testData.forEach((d, i) => {
    const p = (lstmNet.predict(tf.tensor2d([d.input])) as any).arraySync()[0] as number[]
    // const isShow = (!testData[i + 1] || (Math.max(predict[1] / predict[0], predict[2] / predict[1]) > 1.4))
    // const isShow = _.last(d.input) < p[0] && p[0] < p[1] && p[1] < p[2];
    const isShow = _.last(d.input) < .95 && _.last(d.input) > .05 && (_.last(d.input) * 1.1 < p[0]) && (p[0] * 1.1 < p[1]);

    (!testData[i + 1] || isShow) && console.log($u.formatDate(d.time), p.map(p => +(p * 100).toFixed()), ' >>> ', +$u.percentChange(d.price, d.bestPrice).toFixed(0), ' <<<', d.price, '->', d.bestPrice)
  })

  console.log('Test:', lstmNet.evaluate(tf.tensor2d(testData.map(d => d.input)), tf.tensor2d(testData.map(d => d.output))).toString())
  const prices: number[] = testData.map(d => d.price)
  const times: number[] = testData.map(d => d.time * 1000)
  const predicts = await (lstmNet.predict(tf.tensor2d(testData.map(d => d.input))) as any).array()
  const buy: (0 | 1)[] = predicts.map(p => Math.max(p[1] / p[0], p[2] / p[1]) > 1.4 ? 1 : 0)
  const sell: (0 | 1)[] = predicts.map(p => Math.max(p[1] / p[0], p[2] / p[1]) < 1 ? 1 : 0)
  console.log(symbol, tf_, period)
  return { prices, times, buy, sell }
}
const lstm = (inputExample: number[], outputExample: number[]) => {
  console.log('i', inputExample)
  console.log('o', outputExample)
  const inputShape = tf.tensor(inputExample).shape
  console.log({ inputShape })
  const model = tf.sequential()

  // model.add(tf.layers.dropout({ rate: 0.2 }))

  // model.add(tf.layers.lstm({ units: 256, inputShape, activation: 'relu', returnSequences: true }))
  // model.add(tf.layers.lstm({ units: 128, activation: 'relu', returnSequences: true }))
  // model.add(tf.layers.lstm({ units: 64, activation: 'relu' }))
  // model.add(tf.layers.dropout({ rate: 0.2 }))

  model.add(tf.layers.dense({ inputShape, units: 256 }))
  model.add(tf.layers.dense({ units: 256, activation: 'relu' }))
  // model.add(tf.layers.dense({ units: 256, activation: 'relu' }))
  model.add(tf.layers.dense({ units: 128, activation: 'relu' }))
  // model.add(tf.layers.dense({ units: 128, activation: 'relu' }))
  // model.add(tf.layers.dense({ units: 128, activation: 'relu' }))
  model.add(tf.layers.dense({ units: 64, activation: 'relu' }))
  // model.add(tf.layers.dense({ units: 128, activation: 'relu' }))
  // model.add(tf.layers.flatten())

  model.add(tf.layers.dense({ units: outputExample.length, activation: 'relu' }))
  console.log('REady compile')
  model.compile({ optimizer: tf.train.adam(), loss: 'meanSquaredError', metrics: ['accuracy'] })
  console.log('Model:', model.summary())
  console.log('Backend:', tf.getBackend())
  return model
}

const prep3d = (candels: Candel[], opt: { normilizeDemension: number, period: number }) => {
  const { period, normilizeDemension } = opt
  const arrCandels = $u.separateArr(candels.slice(), period * 2)
  const data = arrCandels.map(c => {
    const input = prepInput(c, period * 2, normilizeDemension)
    const output = input.splice(-3)
    const lastC = c.splice(-3)
    const bestPrice = Math.max(...lastC.map(c => c.max))
    return {
      input,
      output,
      time: lastC[0].open_time * 1000,
      price: lastC[0].open,
      bestPrice
    }
  })
  return data
}

export type Log = { iterations: number, error: number }

const perceptronFromTFJS = (hiddenLayers: number[], activation: any = 'relu') => {
  const model = tf.sequential()
  return {
    async trainNet (opt: { data: { input: number[], output: number[] }[], callback: (d: Log) => void, epochs: number, batchSize?: number }) {

      const neurons = [opt.data[0].input.length].concat(hiddenLayers, [opt.data[0].output.length])
      const layers = neurons.map((count, i) => {
        return { inputShape: [count], units: neurons[i + 1], activation }
      }).filter(l => l.units)
      console.log({ neurons, layers })
      layers.forEach(l => model.add(tf.layers.dense(l)))
      model.compile({ optimizer: tf.train.adam(0.1), loss: 'meanSquaredError' })
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

// if (tf === 1)
// { return '1m' }

// if (tf === 3)
// { return '3m' }

// if (tf === 5)
// { return '5m' }

// if (tf === 15)
// { return '15m' }

// if (tf === 30)
// { return '30m' }

// if (tf === 60)
// { return '1h' }

// if (tf === 120)
// { return '2h' }

// if (tf === 240)
// { return '4h' }

// if (tf === 360)
// { return '6h' }

// if (tf === 480)
// { return '8h' }

// if (tf === 720)
// { return '12h' }

// if (tf === 4320)
// { return '3d' }

// if (tf === 10080)
// { return '1w' }

setTimeout(async () => {
  return
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
    console.log(input, predict.map(e => +(e * 15).toFixed()), outputs[i].map(e => e * 15))
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