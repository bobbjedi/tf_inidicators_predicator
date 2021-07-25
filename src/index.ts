import $u, { Candel, Set, LastInput } from './utils';
import * as _ from 'underscore';
import * as brain from './brain';
import { trainNet } from './network';

const Plotly: any = (window as any).Plotly;
// const brain: any = (window as any).brain;
type ClData = { timestamp: string, price: number, unix: number, vol: number };

document.addEventListener('DOMContentLoaded', () => onClickTrainModel('USDT-BTC', 60, 1000, 0));
const isUseSavedNet = false;

function predict(net: any, set: Set[], lastInput: LastInput) {
  $('#div_container_validating').show();
  $('#load_validating').show();
  $('#btn_validation').hide();

  const times = set.map(s => s.time);
  const prices = set.map(s => s.price).concat(lastInput.price);
  const inputs = set.map(s => s.set.input);
  const outputs = set.map(s => s.set.output[0]);
  const predicts = inputs.concat(lastInput.inp).map(i => net.run(i)[0]).splice(-prices.length);
  const fullTimes = times.slice();
  fullTimes.push($u.formatDate(lastInput.unix));

  const signalsTimes: string[] = [];
  for (let i = 1; i < times.length; i++) {
    if (
      predicts[i] > 0.5 && outputs[i] > 0.5 // both more that 0.5
      && predicts[i - 1] < 0.1 && outputs[i - 1] < 0.1 // both pred was low
      && predicts[i + 1] < 0.3 // next predict low again
    ) {
      signalsTimes.push(times[i]);
    }
  }
  console.log('prices:', prices);
  console.log('predicts:', predicts );
  console.log('outputs:', outputs);
  console.log('Times:', times);
  console.log('fullTimes:', fullTimes);
  console.log('signalsTimes:', signalsTimes);

  const graph_plot = document.getElementById('div_validation_graph');
  Plotly.newPlot(graph_plot, [{ x: fullTimes, y: $u.normalizeArr(prices), name: 'Actual Price' }], { margin: { t: 0 } });
  Plotly.plot(graph_plot, [{ x: times, y: outputs, name: 'Calc out'}], { margin: { t: 0 } });
  Plotly.plot(graph_plot, [{ x: fullTimes, y: predicts, name: 'Predict'}], { margin: { t: 0 } });
  Plotly.plot(graph_plot, [{ x: signalsTimes, y: signalsTimes.map(e => .5), name: 'Predict' }], { margin: { t: 0 } });
}

function onClickValidate(brainNet: any, set: Set[], lastInput: LastInput, testCount: number) {

  $('#div_container_validating').show();
  $('#load_validating').show();
  $('#btn_validation').hide();

  const times = set.map(s => s.time);
  const prices = set.map(s => s.price);
  const inputs = set.map(s => s.set.input);
  const outputs = set.map(s => s.set.output[0]);

  const knownTimes = times.slice();
  const unknownOutputs = inputs.splice(-testCount).concat([lastInput.inp]).map(i => brainNet.run(i)[0]);
  const unknownTimes = knownTimes.splice(-testCount).concat($u.formatDate(lastInput.unix));
  const knownOutputs = inputs.map(i => brainNet.run(i)[0]);

  // const knownOutputs = inputs

  console.log('Inputs:', inputs);
  console.log('Outputs:', outputs);
  console.log('knownOutputs:', knownOutputs);
  console.log('times:', times);
  console.log('prices:', prices);

  console.log({ lastInput, t: $u.formatDate(lastInput.unix) });
  // const maxPrice = Math.max(...prices);
  const graph_plot = document.getElementById('div_validation_graph');
  Plotly.newPlot(graph_plot, [{ x: times.concat($u.formatDate(lastInput.unix)), y: $u.normalizeArr(prices.concat(lastInput.price)), name: 'Actual Price' }], { margin: { t: 0 } });
  Plotly.plot(graph_plot, [{ x: times, y: outputs, name: 'Training Label (SMA)'}], { margin: { t: 0 } });
  Plotly.plot(graph_plot, [{ x: knownTimes, y: $u.normalizeArr(knownOutputs), name: 'Training Label (SMA)' }], { margin: { t: 0 } });
  Plotly.plot(graph_plot, [{ x: unknownTimes, y: $u.normalizeArr(unknownOutputs), name: 'Training Label (SMA)' }], { margin: { t: 0 } });
  // Plotly.plot(graph_plot, [{ x: times, y: prices.map(e => 0.5).map(p => p * 3000), name: 'Middle line' }], { margin: { t: 0 } });

  document.getElementById('div_network').innerHTML = brain.utilities.toSVG(
    brainNet,
    {
      height: Number(document.getElementById('div_network').offsetHeight - 10),
      width: Number(document.getElementById('div_network').offsetWidth - 10),
    }
  );
  $('#load_validating').hide();
  // onClickPredict();
}


async function onClickTrainModel(symbol: string, tf: number, countCandels: number, testCount: number) {

  const epoch_loss: string[] = [];
  $('#div_container_training').show();
  $('#btn_draw_trainmodel').hide();

  document.getElementById('div_traininglog').innerHTML = '';
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

  const callback = async (log: { iterations: number, error: number}) => {
    callbackChar(log.iterations, { loss: log.error});
  };

  const { net, set, lastInput } = await trainNet({ symbol, tf, countCandels, callback, testCount, isUseSavedNet });
  console.log('NETWORK!', net);

  $('#div_container_validate').show();
  $('#div_container_predict').show();

  // onClickValidate(net, set, lastInput, testCount);
  predict(net, set, lastInput);
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



// const prepSetByOutputs = (set: Set[]) => {
//   const inputs = separateArr(set.map(s => s.set.output[0]), 10);
//   const outputs = inputs.map((input, i) => {
//     const nextInput = inputs[i + 1];
//     if (!nextInput) return;
//     return nextInput.slice().splice(-1)[0];
//   });

//   const setForOuts: Set['set'][] = [];
//   inputs.forEach((inp, i) => {
//     if (!outputs[i]) return;
//     setForOuts.push({
//       input: inp,
//       output: [outputs[i]]
//     });
//   });
//   console.log('setForOuts', setForOuts);
//   return setForOuts;
// };

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
