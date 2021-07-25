// https://medium.com/@edoh.dev/perceptron-model-tensorflowjs-eefc81c0ec6f
import * as tfjs from '@tensorflow/tfjs';
import { Tensor2D } from '@tensorflow/tfjs';
import $u from './utils';

export const trainTfPercNet = async ({ symbol, tf, countCandels, testCount, callback }: { symbol: string; tf: number, countCandels: number, testCount: number, callback?: (a: any) => void }) => {
    callback = callback || console.log;
    const candels = await $u.getCandels('binance', symbol, countCandels, tf); //  баржа, пара, период, TF в минутах
    const { set, lastInput } = $u.prepSet(candels);

    const X = set.map(s => $u.normalizeArr(s.set.input));
    const Y = set.map(s => s.set.output[0]);
    const inputTensor = tfjs.tensor2d(X);
    const labelTensor = tfjs.tensor1d(Y);

    console.log('X', X);
    console.log('Y', Y);

    const model = tfjs.sequential();
    model.add(tfjs.layers.dense({
        units: 32,
        activation: 'relu',
        inputShape: [X[0].length]
    }));

    model.add(tfjs.layers.dense({units: 32}));
    model.add(tfjs.layers.dense({units: 64}));
    model.add(tfjs.layers.dense({units: 32}));

    model.add(tfjs.layers.dense({ units: 1 }));
    model.compile({ loss: 'meanSquaredError', optimizer: 'adam' });
    (model as any).run = (input: number[]) => {
        return (model.predict(tfjs.tensor2d([input])) as Tensor2D).dataSync();
    };
    console.log('Done:', await model.fit(inputTensor, labelTensor, {
        epochs: 100,
        batchSize: 64,
        callbacks: {
            onEpochEnd(iterations, { loss }) {
                // log: { iterations: number, error: number}
                console.log('LOG', loss);
                callback({
                    iterations,
                    error: loss
                });
            }
        }
    }));
    return { net: model, lastInput, set };
};