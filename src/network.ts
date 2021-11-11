import * as brain from './brain'
import * as _ from 'underscore'
import $u from './utils'

export const trainNet = async ({ symbol, tf, countCandels, testCount, callback }: { symbol: string; tf: number, countCandels: number, testCount: number, callback?: (a: any) => void }) => {
  callback = callback || console.log
  let candels = await $u.getCandels('binance', symbol, countCandels, tf) //  баржа, пара, период, TF в минутах
  let i = 1
  while (i++ < 3) {
    console.log('End:', candels[0].open_time)
    candels = (await $u.getCandels('binance', symbol, countCandels, tf, candels[0].open_time * 1000)).concat(candels)
  }

  const { set, lastInput } = $u.prepSet(candels)
  const trainingData = _.shuffle(set.slice(0, set.length - testCount).map(s => s.set))

  // const positive = allTrainingData.filter(s => s.output[0] > .3)
  // const flet = allTrainingData.filter(s => s.output[0] <= .3)
  // const negative = allTrainingData.filter(s => s.output[0] === 0)
  // const count = Math.min(positive.length, negative.length, flet.length)

  // const trainingData = _.shuffle(positive.splice(-count).concat(negative.splice(-count), flet.splice(-count)))
  // console.log(count, allTrainingData, trainingData)

  const netOptions = {
    hiddenLayers: [24, 32, 8], // array of ints for the sizes of the hidden layers in the network
  }
  const trainingOptions = {
    log: true, // true to use console.log, when a function is supplied it is used --> Either true or a function
    logPeriod: 100, // iterations between logging out --> number greater than 0
    learningRate: 0.4, // scales with delta to effect training rate --> number between 0 and 1
    momentum: 0.4, // scales with next layer's change value --> number between 0 and 1
    iterations: 2500,
    callback,
    callbackPeriod: 10, // the number of iterations through the training data between callback calls --> number greater than 0
  }
  // const crossValidate = new brain.CrossValidate(brain.NeuralNetwork, netOptions);
  // const stats = crossValidate.train(trainingData, trainingOptions);
  // const net = crossValidate.toNeuralNetwork();

  const net = new brain.NeuralNetwork(netOptions)

  const stats = await net.trainAsync(trainingData, trainingOptions)
  console.log('stats:', stats)
  console.log('net:', net)
  return { net, set, lastInput }
}