// tslint:disable-next-line: no-var-requires
// const brain = require('./brain');
import * as brain from './brain';
// import * as brain from 'brain.js';
import * as _ from 'underscore';
import $u from './utils';


export const trainBrainNet = async ({ symbol, tf, countCandels, testCount, callback }: { symbol: string; tf: number, countCandels: number, testCount: number, callback?: (a: any) => void }) => {
    callback = callback || console.log;
    const candels = await $u.getCandels('binance', symbol, countCandels, tf); //  баржа, пара, период, TF в минутах
    const { set, lastInput } = $u.prepSet(candels);

    const netOptions = {
        hiddenLayers: [32, 64, 32], // array of ints for the sizes of the hidden layers in the network
    };
    const trainingOptions = {
        log: true, // true to use console.log, when a function is supplied it is used --> Either true or a function
        logPeriod: 100, // iterations between logging out --> number greater than 0
        learningRate: 0.4, // scales with delta to effect training rate --> number between 0 and 1
        momentum: 0.4, // scales with next layer's change value --> number between 0 and 1
        iterations: 5000,
        callback,
        callbackPeriod: 100, // the number of iterations through the training data between callback calls --> number greater than 0
    };
    const trainingData = _.shuffle(set.slice(0, set.length - testCount).map(s => s.set));

    // const crossValidate = new brain.CrossValidate(brain.NeuralNetwork, netOptions);
    // const stats = crossValidate.train(trainingData, trainingOptions);
    // const net = crossValidate.toNeuralNetwork();

    const net = new brain.NeuralNetwork(netOptions);

    const stats = net.train(trainingData, trainingOptions);
    console.log('stats:', stats);
    console.log('net:', net);
    return { net, set, lastInput };
};