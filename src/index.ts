import $u from './utils';
import { Candel } from './utils';
// import * as brain from 'brain.js';
import { trainModel, makePredictions } from './model';
import * as _ from 'underscore';

// import * as brain from './brainjsModel';
// console.log({brain});

type IndicData = {
  times: number[];
  indic: number[];
  prices: number[];
  volumes: number[];
};

const result: any = [];
let data_raw: ClData[] = [];
let sma_vec: SmaData[] = [];
let candels: Candel[] = [];
let indicData: IndicData;
let window_size = 50;

const Plotly: any = (window as any).Plotly;
const brain: any = (window as any).brain;
type ClData = { timestamp: string, price: number, unix: number, vol: number };

async function onClickFetchData(symbol: string, period = 3, minutes = 720) {
  window_size = period;
  // (document.getElementById("input_epochs") as any).value = epochs;
  console.log('Fetch', symbol);
  candels = await $u.getCandels('binance', symbol, 999, minutes); //  баржа, пара, период, TF в минутах
  // indicData = getSMA(candels, window_size);
  // indicData = getPVT(candels);
  // indicData = getPrices(candels);

  // let ticker = document.getElementById("input_ticker").value;
  $('#btn_fetch_data').hide();
  $('#load_fetch_data').show();

  const message = `CHECK [${symbol}] tf: ${minutes}`;
  $('#div_container_linegraph').show();
  data_raw = candels.map(c => {
    return { timestamp: formatDate(c.close_time * 1000), price: c.close, unix: c.close_time * 1000, vol: c.volume } as ClData;
  });
  sma_vec = [];
  console.log('data_raw>', data_raw);
  const index = 0;
  $('#btn_fetch_data').show();
  $('#load_fetch_data').hide();
  $('#symbol-name').text(message);
  $('#div_container_getsma').show();
  $('#div_container_getsmafirst').hide();
  // onClickDisplaySMA();
  onClickTrainModel();
}

function onClickDisplaySMA(){
  $('#btn_draw_sma').hide();
  $('#load_draw_sma').show();
  $('#div_container_sma').show();

  // window_size = parseInt((document.getElementById("input_windowsize") as any).value);

  sma_vec = ComputeSMA(data_raw, window_size);

  const { prices, times, indic, volumes} = indicData;

  const time_to_str = times.map(formatDate);
  const graph_plot = document.getElementById('div_linegraph_sma');
  Plotly.newPlot( graph_plot, [{ x: time_to_str, y: prices, name: 'Stock Price' }], { margin: { t: 0 } } );
  Plotly.plot( graph_plot, [{ x: time_to_str, y: indic, name: 'PVT' }], { margin: { t: 0 } } );
  Plotly.plot(graph_plot, [{ x: time_to_str, y: volumes.map(e => e / 3), name: 'Vol' }], { margin: { t: 0 } });

  $('#div_linegraph_sma_title').text('Stock Price and Simple Moving Average (window: ' + window_size + ')' );
  $('#btn_draw_sma').show();
  $('#load_draw_sma').hide();

  $('#div_container_train').show();
  // displayTrainingData();
  onClickTrainModel();
}


async function onClickTrainModel(){
  // window_size = 14;
  const epoch_loss: string[] = [];

  $('#div_container_training').show();
  $('#btn_draw_trainmodel').hide();

  document.getElementById('div_traininglog').innerHTML = '';
  console.log('indicData', indicData);
  const set = prepSet(candels);
  console.log('Set:', set.length);
  // return;
  // trainingsize = parseInt((document.getElementById('input_trainingsize') as any).value);
  // const n_epochs = parseInt((document.getElementById('input_epochs') as any).value);
  const n_epochs = 99;
  const callbackChar = (epoch: number, log: any) => {
    let logHtml = document.getElementById('div_traininglog').innerHTML;
    logHtml = '<div>Epoch: ' + (epoch + 1) + ' (of '+ n_epochs +')' +
      ', loss: ' + log.loss +
      '</div>' + logHtml;

    epoch_loss.push(log.loss);
    document.getElementById('div_traininglog').innerHTML = logHtml;
    document.getElementById('div_training_progressbar').style.width = Math.ceil(((epoch + 1) * (100 / n_epochs))).toString() + '%';
    document.getElementById('div_training_progressbar').innerHTML = Math.ceil(((epoch + 1) * (100 / n_epochs))).toString() + '%';

    const graph_plot = document.getElementById('div_linegraph_trainloss');
    Plotly.newPlot( graph_plot, [{x: Array.from({length: epoch_loss.length}, (v, k) => k+1), y: epoch_loss, name: 'Loss' }], { margin: { t: 0 } } );
  };

  const net = new brain.NeuralNetwork({
    // inputSize: [window_size, window_size],
    // inputRange: 20,
    // hiddenLayers: [20, 20],
    // outputSize: 20,
    // learningRate: 0.01,
    // decayRate: 0.999,
    // hiddenLayers: [window_size, window_size], // array of ints for the sizes of the hidden layers in the network
    hiddenLayers: [8], // array of ints for the sizes of the hidden layers in the network
    // activation: 'leaky-relu', // supported activation types: ['sigmoid', 'relu', 'leaky-relu', 'tanh'],
    // leakyReluAlpha: 0.01, // supported for activation type 'leaky-relu'
  });

  const callback_ = async (log: { iterations: number, error: number}) => {
    callbackChar(log.iterations, { loss: log.error});
  };
  console.log('Res train', net.train(
    set.map(s =>s.set),
    {
      log: true, // true to use console.log, when a function is supplied it is used --> Either true or a function
      logPeriod: 100, // iterations between logging out --> number greater than 0
      learningRate: 0.3, // scales with delta to effect training rate --> number between 0 and 1
      momentum: 0.3, // scales with next layer's change value --> number between 0 and 1
      iterations: 5000,
      // binaryThresh: 0.035,
      // binaryThresh: 0.000001,
      callback: callback_, // a periodic call back that can be triggered while training --> null or function
      callbackPeriod: 100, // the number of iterations through the training data between callback calls --> number greater than 0
    }));
    console.log(net);

  $('#div_container_validate').show();
  $('#div_container_predict').show();
  onClickValidate(net, set);
}

function onClickValidate(brainNet: any, set: Set[]) {

  $('#div_container_validating').show();
  $('#load_validating').show();
  $('#btn_validation').hide();

  const times = set.map(s => s.time);
  const prices = set.map(s => s.price);
  const inputs = set.map(s => s.set.input);
  const outputs = set.map(s => s.set.output[0]);
  const knownOutputs = inputs.map(i => brainNet.run(i)[0]);
  console.log('Inputs:', inputs);
  console.log('Outputs:', outputs);
  console.log('knownOutputs:', knownOutputs);
  console.log('times:', times);
  console.log('prices:', prices);
  // return;
  // const prices = indicData.prices.slice().splice(-inputs.length);
  // // const times = indicData.times.slice().map(t => formatDate(t * 1000));
  // const times_prices = times.slice().splice(-prices.length);
  // console.log('time', times);

  // const brainInput = separateArr(indicData.indic, window_size);
  // const outUnSeen = normalizeArr(brainInput.map(i => brainNet.run(i)[0])).splice(-unSeenCount).map(e => e / 3);
  // const out = normalizeArr(brainInput.map(i => brainNet.run(i)[0])).map(e => e / 3);

  // const times_brain = times.slice().splice(-out.length);
  // const timesUnseen = times_brain.splice(-unSeenCount);

  // console.log('Out len', out.length);
  // console.log('outUnSeen len', outUnSeen.length);
  // console.log('Prices len', prices.length);
  // console.log('Times len', times.length);


  // Second net
  // const net2 = new brain.NeuralNetwork({
  //   hiddenLayers: [window_size, window_size],
  // });
  // // times: number[];
  // // indic: number[];
  // // prices: number[];
  // // volumes: number[];
  // const data = {
  //   prices,
  //   indic: out.concat(outUnSeen).splice(-prices.length)
  // } as IndicData;
  // const set2 = prepSet2(data, window_size);
  // console.log('Set2', set2);

  // net2.train(
  //   set2,
  //   {
  //     log: true, // true to use console.log, when a function is supplied it is used --> Either true or a function
  //     logPeriod: 100, // iterations between logging out --> number greater than 0
  //     learningRate: 0.03, // scales with delta to effect training rate --> number between 0 and 1
  //     momentum: 0.01, // scales with next layer's change value --> number between 0 and 1
  //     iterations: 20000,
  //     binaryThresh: 0.035,
  //     callbackPeriod: 100, // the number of iterations through the training data between callback calls --> number greater than 0
  //   });

  // const out2 = normalizeArr(separateArr(out.concat(outUnSeen), window_size).splice(-times_prices).map(i => net2.run(i)[0])).map(e => e / 3);
  // console.log('out2>>>', out2)
  // return;
  const graph_plot = document.getElementById('div_validation_graph');
  Plotly.newPlot(graph_plot, [{ x: times, y: prices, name: 'Actual Price' }], { margin: { t: 0 } });
  // Plotly.plot(graph_plot, [{ x: times, y: outputs, name: 'Training Label (SMA)'}], { margin: { t: 0 } });
  Plotly.plot(graph_plot, [{ x: times, y: knownOutputs, name: 'Training Label (SMA)'}], { margin: { t: 0 } });
  // Plotly.plot( graph_plot, [{ x: timesUnseen, y: outUnSeen, name: 'Predicted (train)' }], { margin: { t: 0 } } );
  // Plotly.plot(graph_plot, [{ x: times_prices, y: out2, name: "Predicted (train)" }], { margin: { t: 0 } });
  Plotly.plot(graph_plot, [{ x: times, y: prices.map(e => 0.5), name: 'Predicted (train)' }], { margin: { t: 0 } });
  // Plotly.plot( graph_plot, [{ x: timesUnSeen, y: outUnSeen, name: "Predicted (test)" }], { margin: { t: 0 } } );
  // Plotly.plot( graph_plot, [{ x: timesUnSeen, y: outUnSeen1, name: "Predicted (test)" }], { margin: { t: 0 } } );

  $('#load_validating').hide();
  // onClickPredict();
}

type SmaData = {
  set: ClData[];
  avg: number;
};
function ComputeSMA(data: ClData[], period: number): SmaData[] {
  const maxPrice = Math.max(...data.map(e => e.price));
  const minPrice = Math.min(...data.map(e => e.price));

  const maxVol = Math.max(...data.map(e => e.vol));
  const minVol = Math.min(...data.map(e => e.vol));

  console.log({maxPrice, minPrice, maxVol, minVol});
  data.forEach(e => {
    e.price = $u.normalise(e.price, minPrice, maxPrice);
    e.vol = $u.normalise(e.vol, minVol, maxVol);
  });

  const offset = 0;
  const r_avgs: any[] = [];
  //  avg_prev = 0;
  for (let i = offset; i <= data.length - period; i++) {
    let curr_avg = 0.00;
    const t = i + period;
    for (let k = i; k < t && k <= data.length; k++){
      curr_avg += data[k]['price'] / period;
    }
    // r_avgs.push({ set: data.slice(i - offset, i + window_size - offset), avg: curr_avg });
    data[i + period + offset] && r_avgs.push({ set: data.slice(i, i + period), avg: data[i + period + offset].price });
    // avg_prev = curr_avg;
  }
  return r_avgs;
}


// https://system-fx.ru/wp-content/uploads/2013/08/PVT_1-641x400.png

const normalizeArr = (data: number[]) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  console.log({max, min});
  return data.map(e => $u.normalise(e, min, max));
};
const normmaliseClData = (data: ClData[]) => {
  const data_: ClData[] = JSON.parse(JSON.stringify(data));
  const maxPrice = Math.max(...data_.map(e => e.price));
  const minPrice = Math.min(...data_.map(e => e.price));

  const maxVol = Math.max(...data_.map(e => e.vol));
  const minVol = Math.min(...data_.map(e => e.vol));

  console.log({maxPrice, minPrice, maxVol, minVol});
  data_.forEach(e => {
    e.price = $u.normalise(e.price, minPrice, maxPrice);
    e.vol = $u.normalise(e.vol, minVol, maxVol);
  });
  return data_;
};

const separateArr = <Type>(arr: Type[], period: number) => {
  // let prices: number[] = data_raw.map(function (val: any) { return val['price']; });
  const inputs: Type[][] = [];
  let i = 0;
  while (i <= arr.length - period) {
    inputs.push(arr.slice(i, period + i));
    i++;
  }
  return inputs;
};

function formatDate(date: number) {
  return new Date(date).toLocaleString();
}

const triggerPercent = 10;
const unSeenCount = 100;

type Set = {
  set: {
    input: number[],
    output: number[]
  },
  price: number,
  time: string
};

const prepSet = (candels_: Candel[], offset = 1) => {
  const arrCandels = separateArr(candels_, 24);
  const set: Set[] = [];
  arrCandels.forEach((e, i) => {
    if (!arrCandels[i + offset + 1]) return;
    const change1 = $u.mathChangedLast2Candels($u.resizeCandels(e, 2), 1);
    const change2 = $u.mathChangedLast2Candels($u.resizeCandels(e, 4), 1);
    const change3 = $u.mathChangedLast2Candels($u.resizeCandels(e, 6), 1);
    const change4 = $u.mathChangedLast2Candels($u.resizeCandels(e, 8), 1);
    const change5 = $u.mathChangedLast2Candels($u.resizeCandels(e, 10), 1);

    const { close, close_time } = e[e.length - 1];
    const nextMaxClose = Math.max(arrCandels[i + offset][arrCandels[i + offset].length - 1].close, arrCandels[i + offset + 1][arrCandels[i + offset + 1].length - 1].close);
    const output = $u.percentChange(close, nextMaxClose);

    set.push({
      set: {
        input: [change1.price, change2.price, change3.price, change4.price],
        // input: [change3.price, change6.price, change9.price, change12.price, change3.volume, change6.volume, change9.volume, change12.volume],
        output: [output]
      },
      price: close,
      time: formatDate(close_time * 1000)
    });
  });

  const positive = _.shuffle(set.filter(e => e.set.output[0] > .5));
  // const flet = _.shuffle(set.filter(e => e.set.output[0] > .45 && e.set.output[0] < .55));
  // const flet = [];
  const negative = _.shuffle(set.filter(e => e.set.output[0] < .5));
  const count = Math.min(positive.length, negative.length);
  console.log({ positive, negative, count });
  // const filterred = _.shuffle(positive.concat(negative, flet));
  const filterred = set;
  const allInputs = filterred
    .map(e => e.set.input)
    .reduce((s, a) => {
      return s.concat(a);
    }, []);

  const allOutputs = filterred
    .map(e => e.set.output[0]);
  console.log({ allInputs, allOutputs });
  const maxInput = Math.max(...allInputs);
  const minInput = Math.min(...allInputs);
  const maxOut = Math.max(...allOutputs);
  const minOut = Math.min(...allOutputs);
  // return;
  // console.log(changesOfPrices);
  // const max = Math.max(...changesOfPrices);
  // const min = Math.min(...changesOfPrices);
  const maxPrice = Math.max(...set.map(e => e.price));
  const minPrice = Math.min(...set.map(e => e.price));
  set.forEach(s => {
    s.set.input = s.set.input.map(i => $u.normalise(i, minInput, maxInput));
    s.set.output = s.set.output.map(o => $u.normalise(o, minOut, maxOut));
    s.price = $u.normalise(s.price, minPrice, maxPrice);
  });
  // const { prices, indic } = indicData;
  // console.log({prices, indic});
  // const indics = separateArr(indic, period).slice(0, indic.length - unSeenCount);
  // const sepPrices = separateArr(prices, period).slice(0, indic.length - unSeenCount);
  // const set: { input: number[], output: number[] }[] = [];

  // indics.forEach((indic, i) => {
  //   const nextEl = indics[i + offset];
  //   if (!nextEl) return set.push({ input: [], output: [0] });
  //   const maxPriceForOffset = Math.max(...nextEl.slice(0, offset));
  //   const setEl = {
  //     input: indic,
  //     output: [0]
  //     // output: [maxPriceForOffset]
  //   };
  //   if ($u.percentChange(sepPrices[i][indic.length - 1], maxPriceForOffset) >= triggerPercent) {
  //     setEl.output = [1];
  //   }
  //   set.push(setEl);
  // });
  console.log('All set', set);
  // return _.shuffle(set);
  return set;
  // const positive = _.shuffle(set.filter(e => e.input.length && e.output[0]));
  // const negative = _.shuffle(set.filter(e => e.input.length && !e.output[0]));
  // const count = Math.min(positive.length, negative.length);
  // console.log(positive.length, negative.length, {count});
  // return _.shuffle(positive.splice(-count).concat(negative.splice(-count)));
  // return _.shuffle(positive.concat(negative));
};

// const prepSet2 = (indicData: IndicData, period: number, offset = 1) => {
//   const { prices, indic } = indicData;
//   console.log({ prices, indic });
//   const indics = separateArr(indic.map(i => i * 0.3), period);
//   const sepPrices = separateArr(prices, period);
//   const set: { input: number[], output: number[] }[] = [];

//   indics.forEach((indic, i) => {
//     const nextEl = indics[i + offset];
//     if (!nextEl) return set.push({ input: [], output: [0] });
//     const maxPriceForOffset = Math.max(...nextEl.slice(0, offset));
//     const setEl = {
//       input: indic,
//       output: [0]
//       // output: [maxPriceForOffset]
//     };
//     if ($u.percentChange(sepPrices[i][indic.length - 1], maxPriceForOffset) >= triggerPercent) {
//       setEl.output = [1];
//     }
//     set.push(setEl);
//   });
//   console.log('All set 2:', set);

//   const positive = _.shuffle(set.filter(e => e.input.length && e.output[0]));
//   const negative = _.shuffle(set.filter(e => e.input.length && !e.output[0]));
//   const count = Math.min(positive.length, negative.length);
//   console.log(positive.length, negative.length, { count });
//   return _.shuffle(positive.splice(-count).concat(negative.splice(-count)));

// }


// const prepSet2 = (indicData: IndicData, period: number, offset = 1) => {
//   const { prices, indic } = indicData;
//   const indics = separateArr(indic, period).splice(-unSeenCount);
//   const sepPrices = separateArr(prices, period).splice(-unSeenCount);
//   const set: { input: number[], output: number[] }[] = [];

//   indics.forEach((indic, i) => {
//     const nextEl = sepPrices[i + period + 1];
//     if (!nextEl) return set.push({ input: [], output: [0] });
//     const maxPriceForOffset = Math.max(...nextEl.slice(0, offset));
//     // console.log(sepPrices[i], maxPriceForOffset)
//     const setEl = {
//       input: indic,
//       output: [0]
//     };
//     if ($u.percentChange(sepPrices[i][indic.length - 1], maxPriceForOffset) >= triggerPercent) {
//       setEl.output = [1];
//     }
//     set.push(setEl);
//   });

//   const positive = _.shuffle(set.filter(e => e.input.length && e.output[0]));
//   const negative = _.shuffle(set.filter(e => e.input.length && !e.output[0]));
//   const count = Math.min(positive.length, negative.length);
//   console.log(positive.length, negative.length, {count});
//   return _.shuffle(positive.splice(-count).concat(negative.splice(-count)));
// };

//////
document.addEventListener('DOMContentLoaded', () => onClickFetchData('BTC-ETH', 14, 60));