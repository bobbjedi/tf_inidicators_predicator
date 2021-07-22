import $u from './utils';
import { Cline } from './utils';
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

let result: any = [];
let data_raw: ClData[] = [];
let sma_vec: SmaData[] = [];
let clines: Cline[] = [];
let indicData: IndicData;
let window_size = 50;
let trainingsize = 70;
const Plotly: any = (window as any).Plotly;
const brain: any = (window as any).brain;
type ClData = { timestamp: string, price: number, unix: number, vol: number };

async function onClickFetchData(symbol: string, epochs = 3, minutes = 720) {
  (document.getElementById("input_epochs") as any).value = epochs;
  console.log('Fetch', symbol);
  clines = await $u.getClines('binance', symbol, 999, minutes); //  баржа, пара, период, TF в минутах
  // indicData = getSMA(clines, window_size);
  // indicData = getPVT(clines);
  indicData = getPrices(clines);

  // let ticker = document.getElementById("input_ticker").value;
  $("#btn_fetch_data").hide();
  $("#load_fetch_data").show();

  let message = `CHECK [${symbol}] tf: ${minutes}`;
  $("#div_container_linegraph").show();
  data_raw = clines.map(c => {
    return { timestamp: formatDate(c.close_time * 1000), price: c.close, unix: c.close_time * 1000, vol: c.volume } as ClData;
  });
  sma_vec = [];
  console.log('data_raw>', data_raw);
  let index = 0;
  $("#btn_fetch_data").show();
  $("#load_fetch_data").hide();
  $("#symbol-name").text(message);
  $("#div_container_getsma").show();
  $("#div_container_getsmafirst").hide();
  onClickDisplaySMA();
}

function onClickDisplaySMA(){
  $("#btn_draw_sma").hide();
  $("#load_draw_sma").show();
  $("#div_container_sma").show();

  window_size = parseInt((document.getElementById("input_windowsize") as any).value);

  sma_vec = ComputeSMA(data_raw, window_size);

  const { prices, times, indic, volumes} = indicData;

  const time_to_str = times.map(formatDate);
  let graph_plot = document.getElementById('div_linegraph_sma');
  Plotly.newPlot( graph_plot, [{ x: time_to_str, y: prices, name: "Stock Price" }], { margin: { t: 0 } } );
  Plotly.plot( graph_plot, [{ x: time_to_str, y: indic, name: "PVT" }], { margin: { t: 0 } } );
  Plotly.plot(graph_plot, [{ x: time_to_str, y: volumes.map(e => e / 3), name: "Vol" }], { margin: { t: 0 } });

  $("#div_linegraph_sma_title").text("Stock Price and Simple Moving Average (window: " + window_size + ")" );
  $("#btn_draw_sma").show();
  $("#load_draw_sma").hide();

  $("#div_container_train").show();
  // displayTrainingData();
  onClickTrainModel();
}


async function onClickTrainModel(){
  // window_size = 14;
  let epoch_loss: string[] = [];

  $("#div_container_training").show();
  $("#btn_draw_trainmodel").hide();

  document.getElementById("div_traininglog").innerHTML = "";
  console.log('indicData', indicData);
  const set = prepSet(indicData, window_size);
  console.log('Set:', set.length);
  
  trainingsize = parseInt((document.getElementById("input_trainingsize") as any).value);
  let n_epochs = parseInt((document.getElementById("input_epochs") as any).value);

  let callbackChar = function(epoch: number, log: any) {
    let logHtml = document.getElementById("div_traininglog").innerHTML;
    logHtml = "<div>Epoch: " + (epoch + 1) + " (of "+ n_epochs +")" +
      ", loss: " + log.loss +
      "</div>" + logHtml;

    epoch_loss.push(log.loss);
    document.getElementById("div_traininglog").innerHTML = logHtml;
    document.getElementById("div_training_progressbar").style.width = Math.ceil(((epoch + 1) * (100 / n_epochs))).toString() + "%";
    document.getElementById("div_training_progressbar").innerHTML = Math.ceil(((epoch + 1) * (100 / n_epochs))).toString() + "%";

    let graph_plot = document.getElementById('div_linegraph_trainloss');
    Plotly.newPlot( graph_plot, [{x: Array.from({length: epoch_loss.length}, (v, k) => k+1), y: epoch_loss, name: "Loss" }], { margin: { t: 0 } } );
  };

  const net = new brain.NeuralNetwork({
    // inputSize: [window_size, window_size],
    // inputRange: 20,
    // hiddenLayers: [20, 20],
    // outputSize: 20,
    // learningRate: 0.01,
    // decayRate: 0.999,
    hiddenLayers: [4], // array of ints for the sizes of the hidden layers in the network
    // activation: 'leaky-relu', // supported activation types: ['sigmoid', 'relu', 'leaky-relu', 'tanh'],
    // leakyReluAlpha: 0.01, // supported for activation type 'leaky-relu' 
  });

  const callback_ = async (log: { iterations: number, error: number}) => {
    callbackChar(log.iterations, { loss: log.error});
  };
  net.train(
    set,
    {
      log: true, // true to use console.log, when a function is supplied it is used --> Either true or a function
      logPeriod: 100, // iterations between logging out --> number greater than 0
      learningRate: 0.03, // scales with delta to effect training rate --> number between 0 and 1
      momentum: 0.01, // scales with next layer's change value --> number between 0 and 1
      iterations: 20000,
      binaryThresh: 0.035,
      // binaryThresh: 0.000001,
      callback: callback_, // a periodic call back that can be triggered while training --> null or function
      callbackPeriod: 100, // the number of iterations through the training data between callback calls --> number greater than 0
    });
    console.log(net);

  $("#div_container_validate").show();
  $("#div_container_predict").show();
  onClickValidate(net);
}

function onClickValidate(brainNet: any) {

  $("#div_container_validating").show();
  $("#load_validating").show();
  $("#btn_validation").hide();

 
  let inputs = separateArr(indicData.indic, window_size);
  
  console.log('INDICS:', indicData.indic);
  console.log('INPUTS:', inputs);
  console.log('indicData.prices:', indicData.prices);

  const prices = indicData.prices.slice().splice(-inputs.length);
  const times = indicData.times.slice().map(t => formatDate(t * 1000));
  const times_prices = times.slice().splice(-prices.length);
  console.log('time', times);
  
  const brainInput = separateArr(indicData.indic, window_size);
  const out = normalizeArr(brainInput.map(i => brainNet.run(i)[0])).map(e => e / 3);
  const outUnSeen = normalizeArr(brainInput.map(i => brainNet.run(i)[0])).splice(-unSeenCount).map(e => e / 3);
  
  const times_brain = times.slice().splice(-out.length);
  const timesUnseen = times_brain.splice(-unSeenCount);

  console.log('Out len', out);
  console.log('Times len', times.length);

  
  // return;
  let graph_plot = document.getElementById('div_validation_graph');
  Plotly.newPlot(graph_plot, [{ x: times_prices, y: prices.map(e => e + .4), name: "Actual Price" }], { margin: { t: 0 } });
  Plotly.plot(graph_plot, [{ x: times_brain, y: out, name: "Training Label (SMA)"}], { margin: { t: 0 } });
  Plotly.plot( graph_plot, [{ x: timesUnseen, y: outUnSeen, name: "Predicted (train)" }], { margin: { t: 0 } } );
  // Plotly.plot( graph_plot, [{ x: timesUnSeen, y: outUnSeen, name: "Predicted (test)" }], { margin: { t: 0 } } );
  // Plotly.plot( graph_plot, [{ x: timesUnSeen, y: outUnSeen1, name: "Predicted (test)" }], { margin: { t: 0 } } );

  $("#load_validating").hide();
  // onClickPredict();
}

type SmaData = {
  set: ClData[];
  avg: number;
};
function ComputeSMA(data: ClData[], window_size: number): SmaData[] {
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
  let r_avgs = [], avg_prev = 0;
  for (let i = offset; i <= data.length - window_size; i++) {
    let curr_avg = 0.00, t = i + window_size;
    for (let k = i; k < t && k <= data.length; k++){
      curr_avg += data[k]['price'] / window_size;
    }
    // r_avgs.push({ set: data.slice(i - offset, i + window_size - offset), avg: curr_avg });
    data[i + window_size + offset] && r_avgs.push({ set: data.slice(i, i + window_size), avg: data[i + window_size + offset].price });
    avg_prev = curr_avg;
  }
  return r_avgs;
}


// https://system-fx.ru/wp-content/uploads/2013/08/PVT_1-641x400.png

const getPrices = (clines: Cline[]) => {
  const { prices, times, volumes } = calcPVT(clines);
  return {
    times,
    indic: normalizeArr(prices),
    prices: normalizeArr(prices),
    volumes: normalizeArr(volumes).map(v => v / 3)
  }
};
const getPVT = (clines: Cline[]) => {
  const { PVT, prices, times, volumes } = calcPVT(clines);
  return {
    times,
    indic: normalizeArr(PVT),
    prices: normalizeArr(prices),
    volumes: normalizeArr(volumes)
  }
};
const getSMA = (clines: Cline[], window_size: number) => {
  const { SMA, prices, times, volumes } = calcSMA(clines, window_size);
  return {
    times,
    indic: normalizeArr(SMA),
    prices: normalizeArr(prices),
    volumes: normalizeArr(volumes)
  }
};
const calcPVT = (clines: Cline[]) => {
  const clines_: Cline[] = JSON.parse(JSON.stringify(clines));
  // const data_ = normmaliseClData(data);
  // const maxPrice = Math.max(...clines_.map(c => Math.max(c.close, c.open, c.max, c.min)));
  // const minPrice = Math.max(...clines_.map(c => Math.min(c.close, c.open, c.max, c.min)));
  // const maxVol = Math.max(...clines_.map(c => c.volume));
  // const minVol = Math.min(...clines_.map(c => c.volume));
  // clines_.forEach(c => {
  //   c.open = $u.normalise(c.open, minPrice, maxPrice);
  //   c.close = $u.normalise(c.close, minPrice, maxPrice);
  //   c.max = $u.normalise(c.max, minPrice, maxPrice);
  //   c.min = $u.normalise(c.min, minPrice, maxPrice);
  //   c.volume = $u.normalise(c.volume, minVol, maxVol);
  // });
  const PVT: number[] = [];
  const prices: number[] = [];
  const times: number[] = [];
  const volumes: number[] = [];
  for (let i = 1; i < clines_.length; i++) {
    PVT.push(((clines_[i].close - clines_[i - 1].close) / clines_[i - 1].close) * clines_[i].volume + (PVT[i - 1] || 0));
    // PVT.push(((clines_[i].close - clines_[i - 1].close) / clines_[i - 1].close) * clines_[i].volume);
    prices.push(clines[i].close);
    times.push(clines[i].close_time);
    volumes.push(clines[i].volume);
  }
  return { PVT, prices, times, volumes };
};

const calcSMA = (clines: Cline[], window_size: number) => {
  const clines_: Cline[] = JSON.parse(JSON.stringify(clines));
  const SMA: number[] = [];
  const prices: number[] = [];
  const times: number[] = [];
  const volumes: number[] = [];
  for (let i = window_size; i < clines_.length; i++) {
    // PVT.push(((clines_[i].close - clines_[i - 1].close) / clines_[i - 1].close) * clines_[i].volume + (PVT[i - 1] || 0));
    SMA.push(clines.slice(i - window_size, i).reduce((s, c) => {
      return s + c.close / window_size;
    }, 0));
    prices.push(clines[i].close);
    times.push(clines[i].close_time);
    volumes.push(clines[i].volume);
  }
  return { SMA, prices, times, volumes };
};

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
}

const separateArr = (arr: number[], period: number) => {
  // let prices: number[] = data_raw.map(function (val: any) { return val['price']; });
  let inputs: number[][] = [];
  let i = 0;
  while (i <= arr.length - period) {
    inputs.push(arr.slice(i, period + i));
    i++;
  }
  return inputs;
}

function formatDate(date: number) {
  return new Date(date).toLocaleString()
}

const triggerPercent = 15;
const unSeenCount = 100;

const prepSet = (indicData: IndicData, period: number, offset = 1) => {
  const { prices, indic } = indicData;
  const indics = separateArr(indic, period).splice(-unSeenCount);
  const sepPrices = separateArr(prices, period).splice(-unSeenCount);
  const set: { input: number[], output: number[] }[] = [];

  indics.forEach((indic, i) => {
    const nextEl = indics[i + 1];
    if (!nextEl) return set.push({ input: [], output: [0] });
    const maxPriceForOffset = Math.max(...nextEl.slice(0, offset));
    const setEl = {
      input: indic,
      output: [0]
    };
    if ($u.percentChange(sepPrices[i][indic.length - 1], maxPriceForOffset) >= triggerPercent) {
      setEl.output = [1];
    }
    set.push(setEl);
  });

  const positive = _.shuffle(set.filter(e => e.input.length && e.output[0]));
  const negative = _.shuffle(set.filter(e => e.input.length && !e.output[0]));
  const count = Math.min(positive.length, negative.length);
  console.log(positive.length, negative.length, {count});
  return _.shuffle(positive.splice(-count).concat(negative.splice(-count)));
};

const prepSet2 = (indicData: IndicData, period: number, offset = 1) => {
  const { prices, indic } = indicData;
  const indics = separateArr(indic, period).splice(-unSeenCount);
  const sepPrices = separateArr(prices, period).splice(-unSeenCount);
  const set: { input: number[], output: number[] }[] = [];

  indics.forEach((indic, i) => {
    const nextEl = sepPrices[i + period + 1];
    if (!nextEl) return set.push({ input: [], output: [0] });
    const maxPriceForOffset = Math.max(...nextEl.slice(0, offset));
    // console.log(sepPrices[i], maxPriceForOffset)
    const setEl = {
      input: indic,
      output: [0]
    };
    if ($u.percentChange(sepPrices[i][indic.length - 1], maxPriceForOffset) >= triggerPercent) {
      setEl.output = [1];
    }
    set.push(setEl);
  });

  const positive = _.shuffle(set.filter(e => e.input.length && e.output[0]));
  const negative = _.shuffle(set.filter(e => e.input.length && !e.output[0]));
  const count = Math.min(positive.length, negative.length);
  console.log(positive.length, negative.length, {count});
  return _.shuffle(positive.splice(-count).concat(negative.splice(-count)));
};

////// 
document.addEventListener('DOMContentLoaded', () => onClickFetchData('BTC-ETH', 5, 60));