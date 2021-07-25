// tslint:disable-next-line: no-var-requires
// const { methods, Network, architect } = require('./neataptic');

// import * as carrot from '@liquid-carrot/carrot';
// console.log('carrot', carrot);
// The example Perceptron you see above with 4 inputs, 5 hidden, and 1 output neuron
// let simplePerceptron = new architect.Perceptron(4, 5, 1);
// import * as brain from 'brain.js';
const { methods, Network, architect } = (window as any).neataptic;
import * as _ from 'underscore';
import $u from './utils';


export const trainCarrotNet = async ({ symbol, tf, countCandels, testCount, callback }: { symbol: string; tf: number, countCandels: number, testCount: number, callback?: (a: any) => void }) => {


    callback = callback || console.log;
    const candels = await $u.getCandels('binance', symbol, countCandels, tf); //  баржа, пара, период, TF в минутах
    const { set, lastInput } = $u.prepSet(candels);

    // const netOptions = {
    //     hiddenLayers: [32, 64, 32], // array of ints for the sizes of the hidden layers in the network
    // };
    const trainingData = _.shuffle(set.slice(0, set.length - testCount).map(s => s.set));
    // const net = new architect.Perceptron(set[0].set.input.length, 32, 64, 32, set[0].set.output.length);
    const net = new Network(set[0].set.input.length, 32, 64, 32, set[0].set.output.length);
    // await net.evolve(trainingData, {
    //     iterations: 5000,
    //     mutation: methods.mutation.ALL,
    //     equal: true,
    //     error: 0.005,
    //     elitism: 5,
    //     mutation_rate: 0.5,
    //     schedule: {
    //         iterations: 10,
    //         function: callback
    //     }
    // });
    await net.train(trainingData, {
        log: 10,
        error: 0.003,
        iterations: 1000,
        rate: 0.3
      });

    net.run = (input: number[]) => net.activate.call(net, input);
    console.log('net:', net);
    return { net, set, lastInput };
};


    // var network = new Network(2,1);

    // // XOR dataset
    // var trainingSet = [
    //     { input: [0,0], output: [0] },
    //     { input: [0,1], output: [1] },
    //     { input: [1,0], output: [1] },
    //     { input: [1,1], output: [0] }
    // ];

    // await network.evolve(trainingSet, {
    //     mutation: methods.mutation.FFW,
    //     equal: true,
    //     error: 0.05,
    //     elitism: 5,
    //     mutation_rate: 0.5
    // });

    // // and it works!
    // console.log(network.activate([0,0])); // 0.2413
    // console.log(network.activate([0,1])); // 1.0000
    // console.log(network.activate([1,0])); // 0.7663
    // console.log(network.activate([1,1])); // 0.008