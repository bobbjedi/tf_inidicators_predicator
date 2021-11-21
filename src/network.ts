// import * as tf from '@tensorflow/tfjs'
import * as _ from 'underscore'
import $u from './utils'

export const trainNet = async ({ symbol, tf, countCandels, testCount, callback }: { symbol: string; tf: number, countCandels: number, testCount: number, callback?: (a: Log) => void }) => {
  callback = callback || console.log
  const options = {
    task: 'regression', // or 'classification'
    inputs: 6,
    outputs: 1
  }
  const nn = ml5.neuralNetwork(options)

  console.log(nn)

  let candels = await $u.getCandels('binance', symbol, countCandels, tf) //  баржа, пара, период, TF в минутах
  let i = 1
  while (i++ < 2) {
    console.log('End:', candels[0].open_time)
    candels = (await $u.getCandels('binance', symbol, countCandels, tf, candels[0].open_time * 1000)).concat(candels)
  }

  const { set, lastInput } = $u.prepSet(candels)
  const trainingData = _.shuffle(set.slice(0, set.length - testCount).map(s => s.set))
  trainingData.forEach(d => nn.addData(d.input, d.output))
  const trainingOptions = {
    batchSize: 32,
    epochs: 5,
  }

  // const x = trainingData.map(s => s.input)
  // const y = trainingData.map(s => s.output)
  // nn.addData(x, y)
  // nn.normalizeData()
  function whileTraining (epoch: number, loss: any) {
    // console.log(`epoch: ${epoch}, loss:${loss}`)
    epoch > 3 && callback({ iterations: epoch, error: loss.loss })
    console.log(epoch, loss.loss)
  }
  nn.run = (i: number[]) => new Promise(r => {
    nn.predict(i, (err, res) => console.log(res[0].value))
    return nn.predict(i, r([res[0].value]))
  })
  return new Promise(r => {
    nn.train(trainingOptions, whileTraining, () => {
      console.log('NN', nn)
      r({ net: nn, set, lastInput })
    })
  })

  // const net = perceptronFromTFJS([32])
  // await net.trainNet({ data: trainingData, callback, epochs: 30 })
  // console.log('net:', net)
  // return { net, set, lastInput }
}

export type Log = { iterations: number, error: number}