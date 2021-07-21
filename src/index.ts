import { getClines } from './utils';
import { trainModel, makePredictions } from './model';
// import * as brain from './brainjsModel';
// console.log({brain});
let input_dataset: any = [];
let result: any = [];
let data_raw: any = [];
let sma_vec: any = [];
let window_size = 50;
let trainingsize = 70;
const Plotly: any = (window as any).Plotly;
const brain: any = (window as any).brain;

type Sma_vec = any;

const net = new brain.recurrent.LSTMTimeStep({
  inputSize: 2,
  hiddenLayers: [10],
  outputSize: 2,
});

net.train([
  [1, 3],
  [2, 2],
  [3, 1],
]);

const output = net.run([
  [1, 3],
  [2, 2],
]); // [3, 1]

console.log('OUT', output);
// $(document).ready(function(){
//   $('select').formSelect();
// });


// function onClickChangeDataFreq(freq){
//   console.log(freq.value);
//   data_temporal_resolutions = freq.value;
//   // $("#input_datafreq").text(freq);
// }

async function onClickFetchData(symbol: string, epochs = 3, minutes = 720) {
  (document.getElementById("input_epochs") as any).value = epochs;
  // const clines = await getClines('binance','USDT-BTC', 999, 15); //  баржа, пара, период, TF в минутах
  // const symbol = 'USDT-BTC';
  console.log('Fetch', symbol);
  const clines = await getClines('binance', symbol, 999, minutes); //  баржа, пара, период, TF в минутах
  // let ticker = document.getElementById("input_ticker").value;
  $("#btn_fetch_data").hide();
  $("#load_fetch_data").show();

  // let requestUrl = "";
  // if(data_temporal_resolutions == 'Daily'){
  //   requestUrl = "https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol="+ticker+"&outputsize=full&apikey="+apikey;
  // }else{
  //   requestUrl = "https://www.alphavantage.co/query?function=TIME_SERIES_WEEKLY_ADJUSTED&symbol="+ticker+"&apikey="+apikey;
  // }

  // $.getJSON(requestUrl
  //   ,function(data){
      // let data = gotten_data_raw;
      // console.log(12, JSON.stringify(data))

      let message = `CHECK [${symbol}] tf: ${minutes}`;
      $("#div_container_linegraph").show();

      // let daily = [];
      // if(data_temporal_resolutions == 'Daily'){
      //   daily = data['Time Series (Daily)'];
      // }else{
      //   daily = data['Weekly Adjusted Time Series'];
      // }

      // if(daily){
        // let symbol = data['Meta Data']['2. Symbol'];
        // let last_refreshed = data['Meta Data']['3. Last Refreshed'];

        data_raw = clines.map(c => {
          return { timestamp: formatDate(c.close_time * 1000), price: c.close, unix: c.close_time * 1000 };
        });
        sma_vec = [];
        console.log('data_raw>', data_raw);
        let index = 0;
        
        // for(let date in clines){
        //   data_raw.push({ timestamp: date, price: parseFloat(daily[date]['5. adjusted close']) });
        //   index++;
        // }

        // data_raw.reverse();

        // message = "Symbol: " + symbol + " (last refreshed " + last_refreshed + ")";
      // message = "Symbol: ";

        $("#btn_fetch_data").show();
        $("#load_fetch_data").hide();
        $("#symbol-name").text(message);

        // if(data_raw.length > 0){
        //   let timestamps = data_raw.map(function (val) { return val['timestamp']; });
        //   let prices = data_raw.map(function (val) { return val['price']; });

        //   let graph_plot = document.getElementById('div_linegraph_data');
        //   Plotly.newPlot( graph_plot, [{ x: timestamps, y: prices, name: "Stocks Prices" }], { margin: { t: 0 } } );
        // }

        $("#div_container_getsma").show();
        $("#div_container_getsmafirst").hide();
        onClickDisplaySMA();

      // }else{
      //   $("#div_linegraph_data").text( data['Information'] );
      // }

    // }
  // );

}

function onClickDisplaySMA(){
  $("#btn_draw_sma").hide();
  $("#load_draw_sma").show();
  $("#div_container_sma").show();

  window_size = parseInt((document.getElementById("input_windowsize") as any).value);

  sma_vec = ComputeSMA(data_raw, window_size);

  let sma = sma_vec.map(function (val: any) { return val['avg']; });
  let prices = data_raw.map(function (val: any) { return val['price']; });

  let timestamps_a = data_raw.map(function (val: any) { return val['timestamp']; });
  let timestamps_b = data_raw.map(function (val: any) {
    return val['timestamp'];
  }).splice(window_size, data_raw.length);

  let graph_plot = document.getElementById('div_linegraph_sma');
  Plotly.newPlot( graph_plot, [{ x: timestamps_a, y: prices, name: "Stock Price" }], { margin: { t: 0 } } );
  Plotly.plot( graph_plot, [{ x: timestamps_b, y: sma, name: "SMA" }], { margin: { t: 0 } } );

  $("#div_linegraph_sma_title").text("Stock Price and Simple Moving Average (window: " + window_size + ")" );
  $("#btn_draw_sma").show();
  $("#load_draw_sma").hide();

  $("#div_container_train").show();
  // $("#div_container_trainfirst").hide();

  displayTrainingData();
}


function displayTrainingData(){
  // $("#div_container_trainingdata").show();

  let set = sma_vec.map(function (val: any) { return val['set']; });
  let data_output = "";
  for (let index = 0; index < 25; index++)
  {
     data_output += "<tr><td width=\"20px\">" + (index + 1) +
      "</td><td>[" + set[index].map(function (val: any) {
        return (Math.round(val['price'] * 10000) / 10000).toString();
      }).toString() +
      "]</td><td>" + sma_vec[index]['avg'] + "</td></tr>";
  }

  data_output = "<table class='striped'>" +
  "<thead><tr><th scope='col'>#</th>" +
  "<th scope='col'>Input (X)</th>" +
  "<th scope='col'>Label (Y)</th></thead>" +
  "<tbody>" + data_output + "</tbody>" +
  "</table>";

  $("#div_trainingdata").html(
    data_output
  );
  onClickTrainModel();
}



async function onClickTrainModel(){

  let epoch_loss: string[] = [];

  $("#div_container_training").show();
  $("#btn_draw_trainmodel").hide();

  document.getElementById("div_traininglog").innerHTML = "";

  let inputs = sma_vec.map(function(inp_f: any){
    return inp_f['set'].map(function(val: any) { return val['price']; })
  });
  let outputs = sma_vec.map(function(outp_f: any) { return outp_f['avg']; });

  trainingsize = parseInt((document.getElementById("input_trainingsize") as any).value);
  let n_epochs = parseInt((document.getElementById("input_epochs") as any).value);
  let learningrate = parseFloat((document.getElementById("input_learningrate") as any).value);
  let n_hiddenlayers = parseInt((document.getElementById("input_hiddenlayers") as any).value);

  inputs = inputs.slice(0, Math.floor(trainingsize / 100 * inputs.length));
  outputs = outputs.slice(0, Math.floor(trainingsize / 100 * outputs.length));
  let callback = function(epoch: number, log: any) {
    let logHtml = document.getElementById("div_traininglog").innerHTML;
    logHtml = "<div>Epoch: " + (epoch + 1) + " (of "+ n_epochs +")" +
      ", loss: " + log.loss +
      // ", difference: " + (epoch_loss[epoch_loss.length-1] - log.loss) +
      "</div>" + logHtml;

    epoch_loss.push(log.loss);

    document.getElementById("div_traininglog").innerHTML = logHtml;
    document.getElementById("div_training_progressbar").style.width = Math.ceil(((epoch + 1) * (100 / n_epochs))).toString() + "%";
    document.getElementById("div_training_progressbar").innerHTML = Math.ceil(((epoch + 1) * (100 / n_epochs))).toString() + "%";

    let graph_plot = document.getElementById('div_linegraph_trainloss');
    Plotly.newPlot( graph_plot, [{x: Array.from({length: epoch_loss.length}, (v, k) => k+1), y: epoch_loss, name: "Loss" }], { margin: { t: 0 } } );
  };

  console.log('train X', inputs.length);
  console.log('train Y', outputs.length);

  // inputs.splice(-5);
  // outputs = outputs.splice(-inputs.length);
  const brainInput = sma_vec.map(function (inp_f: any) {
    return inp_f['set'].map(function(val: any) { return val['price']; })
  });
  const net = new brain.recurrent.LSTMTimeStep({
    inputSize: window_size,
    hiddenLayers: [10],
    outputSize: 1,
  });

  net.train(
    brainInput,
    {
      log: true, // true to use console.log, when a function is supplied it is used --> Either true or a function
      logPeriod: 10, // iterations between logging out --> number greater than 0
      learningRate: 0.3, // scales with delta to effect training rate --> number between 0 and 1
      momentum: 0.1, // scales with next layer's change value --> number between 0 and 1
      callback(a, b, c) {
        console.log('BRAIN log:', { a, b, c });
      }, // a periodic call back that can be triggered while training --> null or function
      callbackPeriod: 10, // the number of iterations through the training data between callback calls --> number greater than 0
    });

  // const output = net.run([
  //   [1, 3],
  //   [2, 2],
  // ]); // [3, 1]

  // result = await trainModel(inputs, outputs, window_size, n_epochs, learningrate, n_hiddenlayers, callback);

  let logHtml = document.getElementById("div_traininglog").innerHTML;
  logHtml = "<div>Model train completed</div>" + logHtml;
  document.getElementById("div_traininglog").innerHTML = logHtml;

  $("#div_container_validate").show();
  // $("#div_container_validatefirst").hide();
  $("#div_container_predict").show();
  // $("#div_container_predictfirst").hide();
  onClickValidate();
}

function onClickValidate() {

  $("#div_container_validating").show();
  $("#load_validating").show();
  $("#btn_validation").hide();

  let inputs = sma_vec.map(function(inp_f: any) {
   return inp_f['set'].map(function (val: any) { return val['price']; });
  });

  // validate on training
  let val_train_x = inputs.slice(0, Math.floor(trainingsize / 100 * inputs.length));
  // let outputs = sma_vec.map(function(outp_f) { return outp_f['avg']; });
  // let outps = outputs.slice(0, Math.floor(trainingsize / 100 * inputs.length));
  // console.log('val_train_x', val_train_x)
  let val_train_y = makePredictions(val_train_x, result['model'], result['normalize']);
  // console.log('val_train_y', val_train_y)

  // validate on unseen
  let val_unseen_x = inputs.slice(Math.floor(trainingsize / 100 * inputs.length), inputs.length);
  // console.log('val_unseen_x', val_unseen_x)
  let val_unseen_y = makePredictions(val_unseen_x, result['model'], result['normalize']);
  // console.log('val_unseen_y', val_unseen_y)

  let timestamps_a = data_raw.map(function (val: any) { return val['timestamp']; });
  let timestamps_b = data_raw.map(function (val: any) {
    return val['timestamp'];
  }).splice(window_size, (data_raw.length - Math.floor((100-trainingsize) / 100 * data_raw.length))); //.splice(window_size, data_raw.length);
  // let timestamps_c = data_raw.map(function (val) {
  //   return val['timestamp'];
  // }).splice(window_size + Math.floor(trainingsize / 100 * val_unseen_x.length), data_raw.length);
  let timestamps_sma = data_raw.map(function (val: any) {
    return val['timestamp'];
  }).splice(window_size, data_raw.length);

  let timestamps_c = data_raw.map(function (val: any) {
    return val['timestamp'];
  }).splice(window_size + Math.floor(trainingsize / 100 * inputs.length), inputs.length);

  let sma = sma_vec.map(function (val: any) { return val['avg']; });
  let prices = data_raw.map(function (val: any) { return val['price']; });
  // sma = sma.slice(0, Math.floor(trainingsize / 100 * sma.length));
  sma = sma.slice();

  let graph_plot = document.getElementById('div_validation_graph');
  Plotly.newPlot( graph_plot, [{ x: timestamps_a, y: prices, name: "Actual Price" }], { margin: { t: 0 } } );
  Plotly.plot( graph_plot, [{ x: timestamps_sma, y: sma, name: "Training Label (SMA)" }], { margin: { t: 0 } } );
  Plotly.plot( graph_plot, [{ x: timestamps_b, y: val_train_y, name: "Predicted (train)" }], { margin: { t: 0 } } );
  Plotly.plot( graph_plot, [{ x: timestamps_c, y: val_unseen_y, name: "Predicted (test)" }], { margin: { t: 0 } } );

  $("#load_validating").hide();
  onClickPredict();
}

async function onClickPredict() {

  $("#div_container_predicting").show();
  $("#load_predicting").show();
  $("#btn_prediction").hide();

  let inputs = sma_vec.map(function(inp_f: any) {
   return inp_f['set'].map(function (val: any) { return val['price']; });
  });
  let pred_X = [inputs[inputs.length-1]];
  pred_X = pred_X.slice(Math.floor(trainingsize / 100 * pred_X.length), pred_X.length);
  let pred_y = makePredictions(pred_X, result['model'], result['normalize']);

  window_size = parseInt((document.getElementById("input_windowsize") as any).value);

  let timestamps_d = data_raw.map(function (val: any) {
    return val['unix'];
  }).splice((data_raw.length - window_size), data_raw.length);
  console.log({timestamps_d});
  // date
  const interval = timestamps_d[1] - timestamps_d[0];

  let last_date = timestamps_d[timestamps_d.length-1];
  console.log({interval, last_date});
  // let add_days = 1;
  // if(data_temporal_resolutions == 'Weekly'){
  //   add_days = 7;
  // }
  // last_date.setDate(last_date.getDate() + add_days);
  let next_date = last_date + interval;

  let timestamps_e = next_date;
  console.log('formatDate(timestamps_e)', formatDate(timestamps_e));

  let graph_plot = document.getElementById('div_prediction_graph');
  Plotly.newPlot( graph_plot, [{ x: timestamps_d.map(formatDate), y: pred_X[0], name: "Latest Trends" }], { margin: { t: 0 } } );
  Plotly.plot( graph_plot, [{ x: formatDate(timestamps_e), y: pred_y, name: "Predicted Price" }], { margin: { t: 0 } } );

  $("#load_predicting").hide();
}

function ComputeSMA(data: any, window_size: number) {
  const offset = 12;
  let r_avgs = [], avg_prev = 0;
  for (let i = offset; i <= data.length - window_size; i++){
    let curr_avg = 0.00, t = i + window_size;
    for (let k = i; k < t && k <= data.length; k++){
      curr_avg += data[k]['price'] / window_size;
    }
    r_avgs.push({ set: data.slice(i - offset, i + window_size - offset), avg: curr_avg });
    // data[i + window_size + 1] && r_avgs.push({ set: data.slice(i, i + window_size), avg: data[i + window_size + 1].price });
    avg_prev = curr_avg;
  }
  return r_avgs;
}

function formatDate(date: number) {
  return new Date(date).toLocaleString()
  // var d = new Date(date),
  //     month = '' + (d.getMonth() + 1),
  //     day = '' + d.getDate(),
  //     year = d.getFullYear();

  // if (month.length < 2) month = '0' + month;
  // if (day.length < 2) day = '0' + day;

  // return [year, month, day].join('-');
}

////// 
document.addEventListener('DOMContentLoaded', () => onClickFetchData('BTC-ETH', 5, 60));