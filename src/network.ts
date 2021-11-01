// tslint:disable-next-line: no-var-requires
// const brain = require('./brain');
import * as brain from './brain';
// import * as brain from 'brain.js';
import * as _ from 'underscore';
import $u from './utils';


export const trainNet = async ({ symbol, tf, countCandels, testCount, callback, isUseSavedNet }: { symbol: string; tf: number, countCandels: number, testCount: number, isUseSavedNet: boolean, callback?: (a: any) => void }) => {
    callback = callback || console.log;

    const { trainSet, setForTest } = await getBigSet({ tf });
    console.log('setForTest>>', setForTest)
    const {set, lastInput} = setForTest;

    const trainingData = _.shuffle(trainSet).map(s => s.set);

    const positive = trainingData.filter(s=> s.output[0] > 0.1) 
    const negative = trainingData.filter(s=> s.output[0] === 0)
    const flet = trainingData.filter(s=> s.output[0] > 0 && s.output[0] <= 0.1)
    const count = Math.min(positive.length, negative.length, flet.length)
    console.log('positive | negative | flet', positive.length, negative.length, flet.length)
    const trainingData_ = _.shuffle(positive.splice(-count).concat(negative.splice(-count), flet.splice(-count)))
    
    console.log('TrainingData:', trainingData_, {set, lastInput});

    const netOptions = {
        hiddenLayers: [24, 32, 8, 4], // array of ints for the sizes of the hidden layers in the network
        // hiddenLayers: [16, 32, 8], // array of ints for the sizes of the hidden layers in the network
    };
    const trainingOptions = {
        log: true, // true to use console.log, when a function is supplied it is used --> Either true or a function
        logPeriod: 100, // iterations between logging out --> number greater than 0
        learningRate: 0.4, // scales with delta to effect training rate --> number between 0 and 1
        momentum: 0.4, // scales with next layer's change value --> number between 0 and 1
        iterations: 5000,
        callback,
        callbackPeriod: 100, // the number of iterations through the training data between callback calls --> number greater than 0
        errorThresh: 0.005, // the acceptable error percentage from training data --> number between 0 and 1
        timeout: Infinity, // the max number of milliseconds to train for --> number greater than 0
    };


    // const crossValidate = new brain.CrossValidate(brain.NeuralNetwork, netOptions);
    // const stats = crossValidate.train(trainingData, trainingOptions);
    // const net = crossValidate.toNeuralNetwork();
    const net = new brain.NeuralNetwork(netOptions);
    if (isUseSavedNet) {
        console.log('USE SAVED NET BRAIN.JS!');
        net.fromJSON(JSON.parse(localStorage.getItem('savedBrainNet')));
    } else {
        console.log('Start train net');
        const stats = await net.trainAsync(trainingData_, trainingOptions);
        console.log('stats:', stats);
    }

    console.log('net:', net);

    (window as any).saveNet = () => localStorage.setItem('savedBrainNet', JSON.stringify(net.toJSON()));

    return { net, set, lastInput };
};

const getBigSet = async ({ tf, symbolsList }: { tf: number, symbolsList?: string[] }) => {

    symbolsList = symbolsList || ['USDT-BNB', 'USDT-BCC', 'USDT-EOS', 'USDT-ONT', 'USDT-IOTA', 'USDT-LTC', 'USDT-ADA', 'USDT-MATIC'];
    const testedPair = symbolsList.splice(-1)[0]
    // const testedPair = symbolsList[0]
    const setForTest = await $u.prepSet(await $u.getCandels('binance', testedPair, 1000, tf));

    const trainSet = (await Promise.all(symbolsList.map(async (symbol) => {
        return (await $u.prepSet(await $u.getCandels('binance', symbol, 1000, tf))).set;
    }))).reduce((fullSet, set) => {
        return fullSet.concat(set);
    }, []);
    return { setForTest, trainSet };
    // const { set, lastInput } = $u.prepSet(candels);
};