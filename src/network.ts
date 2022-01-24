import * as tf from '@tensorflow/tfjs'
import * as _ from 'underscore'
import { prepWEMA, prepROC, prepAC, prepMACD } from './prepInput'
import $u, { Candel } from './utils'

export const trainNet = async ({ symbol, tf_, countCandels, testCount, callback }: { symbol: string; tf_: number, countCandels: number, testCount: number, callback?: (a: Log) => void }) => {
  // return
  callback = callback || console.log

  tf_ = 720
  symbol = 'USDT-BTC'
  testCount = 1000
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
  // candels = $u.resizeCandels(candels, 2)
  const arrCandelsLast = $u.separateArr(candels.splice(-testCount), period * 2)
  const data = prep3d(candels, { period, normilizeDemension })

  // const tesCandels = $u.separateArr($u.resizeCandels(await $u.getCandels('binance', symbol, countCandels, 360), 2), period * 2)
  const testData = arrCandelsLast.map(c => {
    c = c.slice()
    return {
      input: [
        prepWEMA(c, period).splice(-data[0].input[0].length),
        // prepROC(c, period).splice(-data[0].input[0].length),
        // prepAC(c, period).splice(-data[0].input[0].length),
      ],
      time: _.last(c).close_time * 1000,
      price: _.last(c).close,
      bestPrice: 0
    }
  })
  // const testData = data.splice(-testCount)
  console.log('data:', data)
  console.log('testData:', testData)
  // console.log('Last:', last)

  const x = data.map(d => d.input)
  const y = data.map(d => d.output)
  const lstmNet = lstm(x[5], y[5])

  const xs = tf.tensor3d(x)
  const ys = tf.tensor2d(y)
  await lstmNet.fit(xs, ys, {
    epochs,
    // batchSize: 32,
    callbacks: {
      onEpochEnd (epoch, log) {
        console.log(epoch, log)
        callback({ error: log.acc, iterations: epoch })
      }
    }
  })
  // testData.forEach((d, i) => {
  //   const p = ((lstmNet.predict(tf.tensor2d([d.input])) as any).arraySync()[0] as number[]).map(r => +r.toFixed(2))
  //   const lastKnown = _.last(d.input)
  //   // ;(p[0] > lastKnown || p[1] > lastKnown || p[2] > lastKnown)
  //   checkIsUp([lastKnown].concat(p))
  //   && console.log($u.formatDate(d.time), [lastKnown].concat(p), d.output, ' >>> ', +$u.percentChange(d.price, d.bestPrice).toFixed(0), ' <<<', d.price, '->', d.bestPrice)
  //   // console.log($u.formatDate(d.time), p, ' >>> ', +$u.percentChange(d.price, d.bestPrice).toFixed(0), ' <<<', d.price, '->', d.bestPrice)
  // })
  // last.forEach(d => {
  // const p = +(((lstmNet.predict(tf.tensor2d([d.inp])) as any).arraySync()[0] as number[])[0] * normilizeDemension).toFixed(1)
  // console.log('t>', $u.formatDate(d.time), '>>', p, '<<', d.price)
  // })

  // console.log('Test:', lstmNet.evaluate(tf.tensor2d(testData.map(d => d.input)), tf.tensor2d(testData.map(d => d.output))).toString())
  const prices: number[] = testData.map(d => d.price)
  const times: number[] = testData.map(d => d.time)
  const predicts = (await (lstmNet.predict(tf.tensor3d(testData.map(d => d.input))) as any).array()) as number[][]
  let isBuy = false
  // const buy: (0 | 1)[] = predicts.map((p, i) => {
  const buy: number[] = predicts.map((p, i) => {
    // const d = testData[i]
    // const nn = _.last(d.input[0]) < p[0]
    const isCheck = p[0] > .1
    if (isCheck && !isBuy) {
      // console.log($u.formatDate(d.time), ' >>> ', +$u.percentChange(d.price, d.bestPrice).toFixed(0), ' <<<', d.price, '->', d.bestPrice)
      isBuy = true
      return p[0]
    }
    isBuy = isCheck
    return 0
  })
  const sell: (0 | 1)[] = predicts.map(p => Math.max(p[1] / p[0], p[2] / p[1]) < 1 ? 1 : 0)
  console.log(symbol, tf_, period)
  return { prices, times, buy, sell }
}
const lstm = (inputExample: number[][], outputExample: number[]) => {
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
  // model.add(tf.layers.dense({ units: 128, activation: 'relu' }))
  // model.add(tf.layers.dense({ units: 128, activation: 'relu' }))
  model.add(tf.layers.dense({ units: 128, activation: 'relu' }))
  // model.add(tf.layers.dense({ units: 64, activation: 'relu' }))
  // model.add(tf.layers.dense({ units: 32, activation: 'relu' }))
  model.add(tf.layers.flatten())

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
  const data = arrCandels.map(c_ => {
    const c = c_.slice()
    const input1 = prepWEMA(c, period).splice(-period)
    const input2 = prepROC(c, period).splice(-period)
    const input3 = prepAC(c, period).splice(-period)
    // const input4 = prepMACD(c, period).splice(-period)
    // console.log(input)
    // const output = input1.splice(-2)
    input1.splice(-2)
    input2.splice(-2)
    input3.splice(-2)
    // input4.splice(-2)

    const lastC = c.splice(-2)
    const bestPrice = Math.max(...lastC.map(c => c.close))
    // console.log(output, $u.percentChange(lastC[0].open, bestPrice))
    return {
      input: [
        input1,
        // input2,
        // input3,
        // input4
      ],
      output: [$u.normalise($u.percentChange(lastC[0].open, bestPrice), 0, normilizeDemension)],
      // output,
      time: lastC[0].open_time * 1000,
      price: lastC[0].open,
      bestPrice
    }
  })
  return data
}

const checkIsUp = (arr: number[]) => {
  // return arr.reduce((res, c, i) => {
  //   return res && c < (arr[i + 1] || Infinity)
  // }, true)
  // return _.last(arr) > .2
  // return arr[1] / arr[0] > 1.1 || arr[2] / arr[1] > 1.1
  return arr[1] > arr[0]
}

export type Log = { iterations: number, error: number }

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
  // const setdata = _.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]).map(e => e / 15)
  // const set = $u.separateArr($u.separateArr(setdata, 3), 3)
  // console.log(set)
  // const lstmNet = lstm(set[0])
  // console.log(':LL', lstmNet)

  // const inputs: number[][][] = []
  // const outputs: number[][] = []
  // set.forEach((input, i) => {
  //   if (!set[i + 1]) {
  //     return
  //   }
  //   inputs.push(input)
  //   outputs.push(set[i + 1][2])
  // })
  // const x = tf.tensor3d(inputs)
  // const y = tf.tensor2d(outputs)
  // await lstmNet.fit(x, y, {
  //   epochs: 100,
  //   // batchSize: 1,
  //   callbacks: {
  //     onEpochEnd (epoch, log) {
  //       epoch > 3 && console.log(epoch, log)
  //     }
  //   }
  // })
  // inputs.forEach((input, i) => {
  //   const predict = (lstmNet.predict(tf.tensor3d([input])) as any).arraySync()[0] as number[]
  //   console.log(input, predict.map(e => +(e * 15).toFixed()), outputs[i].map(e => e * 15))
  // })
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