import $u from './utils';
import { trainModel, makePredictions } from './model';
import { time } from '@tensorflow/tfjs';
let input_dataset: any = [];
let result: any = [];
let data_raw: el[] = [];
let sma_vec: any = [];
let window_size = 50;
let trainingsize = 70;
const Plotly: any = (window as any).Plotly;

// type Sma_vec = any;

// $(document).ready(function(){
//   $('select').formSelect();
// });


// function onClickChangeDataFreq(freq){
//   console.log(freq.value);
//   data_temporal_resolutions = freq.value;
//   // $("#input_datafreq").text(freq);
// }
type el = {
  timestamp: string,
  price: number,
  vol: number,
  unix: number
};
type Sma_Vec = {
  avg: number;
  t: number;
  set: el[];
};

async function onClickFetchData(symbol: string, epochs = 3, minutes = 720) {
  (document.getElementById("input_epochs") as any).value = epochs;
  // const clines = await getClines('binance','USDT-BTC', 999, 15); //  баржа, пара, период, TF в минутах
  // const symbol = 'USDT-BTC';
  console.log('Fetch', symbol);
  const clines = await $u.getClines('binance', symbol, 999, minutes); //  баржа, пара, период, TF в минутах
  console.log({clines});
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
          return { timestamp: formatDate(c.close_time * 1000), price: c.close, vol: c.volume, unix: c.close_time * 1000 };
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

  // console.log('train X', inputs)
  // console.log('train Y', outputs)

//_________________________________________________

  const data: Sma_Vec[] = sma_vec;

  console.log('SMA VEC:', data)
  const times: number[] = [];
  const inputs_ = data.map(inp_f => {
    times.push(inp_f.t);
    return [
      inp_f.set.map(v => v.price),
      inp_f.set.map(v => v.price),
      // inp_f.set.map(v => v.vol),
    ]
  });

  const outputs_ = data.map(function (outp_f) { return outp_f['avg']; }).splice(-inputs_.length);
  console.log('INP:', inputs_.length);
  console.log('OUT', outputs_.length);

  // const i_test = inputs_;
  // const o_test = outputs_;

  const i_test = inputs_.splice(-150);
  const o_test = outputs_.splice(-150);
  // const unvis_times = times.splice(-150);
  console.log('>>', inputs_[10], inputs_[11], outputs_[10], outputs_[11]);
  result = await trainModel(inputs_, outputs_, window_size, n_epochs, learningrate, n_hiddenlayers, callback);
  // console.log('Res:', result);

  let summPercent = 0;
  // const r: number[] = [];
  const known_y = makePredictions(inputs_.concat(i_test), result['model'], result['normalize']);
  const known_time = times.slice();
  // known_time.splice(-150);

  // i_test.forEach((input, i) => {
  known_y.concat(makePredictions(i_test, result['model'], result['normalize']));
  // });
  // console.log('Average', summPercent / i_test.length);
  const interval = times[1] - times[0];
  const p_times = times;
  let i = 0;
  // const inp = r.slice().splice(-30);
  // while (i++ < 1) {
  //   const p = known_y.slice().splice(-20);
  //   const o = makePredictions([[p, p]], result['model'], result['normalize'])[0];
  //   known_y.push(o);
  //   known_time.push(known_time[known_time.length - 1] + interval);
  // } 
  console.log('R:', known_time.map(formatDate), known_y);

  $("#div_container_validating").show();
  $("#load_validating").show();
  $("#btn_validation").hide();

  let graph_plot = document.getElementById('div_validation_graph');
  Plotly.newPlot( graph_plot, [{ x: times.map(formatDate), y: outputs_.concat(o_test), name: "Actual Price" }], { margin: { t: 0 } } );
  Plotly.plot( graph_plot, [{ x: known_time.map(formatDate), y: known_y, name: "Training Label (SMA)" }], { margin: { t: 0 } } );
  // let val_train_y = 
  // console.log({val_train_y, r: outputs[outputs.length - 1]});

  return;
//-------------------------------------------------
  // result = await trainModel(inputs_, outputs_, window_size, n_epochs, learningrate, n_hiddenlayers, callback);

  // let logHtml = document.getElementById("div_traininglog").innerHTML;
  // logHtml = "<div>Model train completed</div>" + logHtml;
  // document.getElementById("div_traininglog").innerHTML = logHtml;

  $("#div_container_validate").show();
  // $("#div_container_validatefirst").hide();
  $("#div_container_predict").show();
  // $("#div_container_predictfirst").hide();
  // onClickValidate();
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

function ComputeSMA(data: el[], window_size: number)
{
  let r_avgs = [], avg_prev = 0;
  for (let i = 0; i <= data.length - window_size; i++){
    // let curr_avg = 0.00, t = i + window_size;
    // for (let k = i; k < t && k <= data.length; k++){
    //   curr_avg += data[k]['price'] / window_size;
    // }
    const set: el[] = data.slice(i, i + window_size);
    data[i + window_size + 1] && r_avgs.push({ set, avg: data[i + window_size + 1].price, t: data[i + window_size + 1].unix} as Sma_Vec);
    // avg_prev = curr_avg;
  }
  console.log(r_avgs);
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
document.addEventListener('DOMContentLoaded', () => onClickFetchData('BTC-ETH', 50, 30));