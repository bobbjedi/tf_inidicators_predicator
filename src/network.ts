import * as tf from '@tensorflow/tfjs'
import * as _ from 'underscore'
import prepInput, { prepSma } from './prepInput'
import $u, { Candel } from './utils'

export const trainNet = async ({ symbol, tf_, countCandels, testCount, callback }: { symbol: string; tf_: number, countCandels: number, testCount: number, callback?: (a: Log) => void }) => {
  // return
  callback = callback || console.log

  tf_ = 720
  symbol = 'USDT-BTC'
  testCount = 500
  const countCandelsReq = 15
  const epochs = 20
  const period = 8
  const normilizeDemension = 5

  let candels = await $u.getCandels('binance', symbol, countCandels, tf_) //  баржа, пара, период, TF в минутах
  let c = 1
  let pred = -1
  while (c++ < countCandelsReq) {
    pred = candels[0]?.open_time
    const newCandels = (await $u.getCandels('binance', symbol, countCandels, tf_, candels[0].open_time * 1000))
    if (newCandels[0].open_time === pred) {
      console.log('End history...')
      break
    }
    candels = newCandels.concat(candels)
    console.log(c, $u.formatDate(candels[0].open_time * 1000), 'End:', candels.length, candels[0].open_time === pred)
  }
  const { x, y } = prep3d(candels, { period, normilizeDemension })
  console.log('x', x, 'y', y)
  const testInp = x.splice(-testCount)
  const testOut = y.splice(-testCount)
  // const testInp = x.slice()
  // const testOut = y.slice()
  const lstmNet = lstm(x[5], y[5])
  const xs = tf.tensor3d(x)
  const ys = tf.tensor2d(y)
  await lstmNet.fit(xs, ys, {
    epochs,
    callbacks: {
      onEpochEnd (epoch, log) {
        console.log(epoch, log)
        callback({ error: log.acc, iterations: epoch })
      }
    }
  })
  console.log('Test inp', testInp)
  console.log('testInp', lstmNet.evaluate(tf.tensor3d(testInp), tf.tensor2d(testOut)).toString())

  const prices: number[] = testInp.map(d => _.last(d).price)
  const times: number[] = testInp.map(d => _.last(d).time)
  const predicts = (await (lstmNet.predict(tf.tensor3d(testInp)) as any).array()) as number[][]
  let isBuy = false
  // const buy: (0 | 1)[] = predicts.map((p, i) => {
  const buy: number[] = predicts.map((p, i) => {
    // const d = testData[i]
    // const nn = _.last(d.input[0]) < p[0]
    const isCheck = p[p.length - 2] < p[p.length - 1]
    if (isCheck && !isBuy) {
      // console.log($u.formatDate(d.time), ' >>> ', +$u.percentChange(d.price, d.bestPrice).toFixed(0), ' <<<', d.price, '->', d.bestPrice)
      isBuy = true
      return 1
    }
    isBuy = isCheck
    return 0
  })
  const sell: (0 | 1)[] = predicts.map(p => Math.max(p[1] / p[0], p[2] / p[1]) < 1 ? 1 : 0)
  console.log({ prices, times, buy })
  return { prices, times, buy, sell }
}
const lstm = (inputExample: number[][], outputExample: number[]) => {
  console.log('i', inputExample)
  console.log('o', outputExample)
  const inputShape = tf.tidy(() => tf.tensor2d(inputExample).shape)
  console.log({ inputShape })
  const model = tf.sequential()

  // model.add(tf.layers.dropout({ rate: 0.2 }))

  // LSTM
  // model.add(tf.layers.lstm({ units: 256, inputShape, activation: 'relu', returnSequences: true }))
  // model.add(tf.layers.lstm({ units: 128, activation: 'relu', returnSequences: true }))
  // model.add(tf.layers.lstm({ units: 64, activation: 'relu' }))

  // model.add(tf.layers.dropout({ rate: 0.2 }))

  // PERCEP
  model.add(tf.layers.dense({ inputShape, units: 256 }))
  model.add(tf.layers.dense({ units: 256, activation: 'relu' }))
  // model.add(tf.layers.dense({ units: 256, activation: 'relu' }))
  model.add(tf.layers.dense({ units: 128, activation: 'relu' }))
  // model.add(tf.layers.dense({ units: 128, activation: 'relu' }))
  // model.add(tf.layers.dense({ units: 128, activation: 'relu' }))
  // model.add(tf.layers.dense({ units: 64, activation: 'relu' }))
  // model.add(tf.layers.dense({ units: 128, activation: 'relu' }))
  model.add(tf.layers.flatten())

  model.add(tf.layers.dense({ units: outputExample.length, activation: 'relu' }))
  model.compile({ optimizer: tf.train.adam(), loss: 'meanSquaredError', metrics: ['accuracy'] })
  // optimizer: 'sgd',
  // loss: 'categoricalCrossentropy',
  // metrics: ['accuracy']
  console.log('Model:', model.summary())
  console.log('Backend:', tf.getBackend())
  return model
}

const prep3d = (candels: Candel[], opt: {normilizeDemension: number, period: number}): {x: number[][][], y: number[][]} => {
  const { period, normilizeDemension } = opt
  // const arrCandels = $u.separateArr(candels.slice(0, 40), period)
  const arrCandels = $u.separateArr(candels.slice(), period * 2)
  // console.log('arrCandels', arrCandels)
  const changes = arrCandels.map(c => prepSma(c, period * 2))

  console.log('z', changes)
  const inputs = $u.separateArr(changes, 10)
  // console.log(inputs)
  const outputs = inputs.map(i => i.pop())

  const x: number[][][] = inputs
  const y: number[][] = outputs
  return { x, y }
}

export type Log = { iterations: number, error: number}

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