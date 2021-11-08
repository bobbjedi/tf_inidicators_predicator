import $u, { Set, LastInput } from './utils'
import * as _ from 'underscore'
import { trainNet } from './network'
const Plotly: any = (window as any).Plotly

document.addEventListener('DOMContentLoaded', () => onClickTrainModel('USDT-XRP', 60, 1000, 0))
const isUseSavedNet = false

function predict (net: any, set: Set[], lastInput: LastInput) {
  $('#div_container_validating').show()
  $('#load_validating').show()
  $('#btn_validation').hide()

  const times = set.map(s => s.time)
  const prices = set.map(s => s.price).concat(lastInput.price)
  const inputs = set.map(s => s.set.input)
  const outputs = set.map(s => s.set.output[0])
  // const predicts = inputs.concat(lastInput.inp).map(i => net.run(i)[0]).splice(-prices.length);
  const predicts = inputs.map(i => net.run(i)[0])
  predicts.push(net.run(lastInput.inp)[0])
  const fullTimes = times.slice()
  fullTimes.push($u.formatDate(lastInput.unix))

  const signalsTimes: string[] = []
  for (let i = 1; i < times.length; i++) {
    if (
      // predicts[i] > 0.2 && outputs[i] > 0.3 // both more that 0.5
      predicts[i - 1] < 0.2 && outputs[i - 1] < 0.2 // both pred was low
      && predicts[i] > 0.5 // next predict low again
    ) {
      signalsTimes.push(times[i])
    }
  }
  console.log('prices:', prices)
  console.log('predicts:', predicts)
  console.log('outputs:', outputs)
  console.log('Times:', times)
  console.log('fullTimes:', fullTimes)
  console.log('signalsTimes:', signalsTimes)
  const maxPrice = Math.max(...prices)
  const minPrice = Math.min(...prices)

  console.log({ minPrice, maxPrice })
  const graph_plot = document.getElementById('div_validation_graph')
  Plotly.newPlot(graph_plot, [{ x: fullTimes, y: prices, name: 'Actual Price' }], { margin: { t: 0 } })
  Plotly.plot(graph_plot, [{ x: times, y: outputs.map(v => minPrice + v * (maxPrice - minPrice)), name: 'Calc out' }], { margin: { t: 0 } })
  Plotly.plot(graph_plot, [{ x: fullTimes, y: predicts.map(v => minPrice + v * (maxPrice - minPrice)), name: 'Predict' }], { margin: { t: 0 } })
  // Plotly.plot(graph_plot, [{ x: signalsTimes, y: signalsTimes.map(x => .5), name: 'Predict' }], { margin: { t: 0 } })
}

async function onClickTrainModel (symbol: string, tf: number, countCandels: number, testCount: number) {

  const epoch_loss: string[] = []
  $('#div_container_training').show()
  $('#btn_draw_trainmodel').hide()

  document.getElementById('div_traininglog').innerHTML = ''
  const n_epochs = 99
  const callbackChar = (epoch: number, log: any) => {
    let logHtml = document.getElementById('div_traininglog').innerHTML
    logHtml = '<div>Epoch: ' + (epoch + 1) + ' (of ' + n_epochs + ')' +
      ', loss: ' + log.loss +
      '</div>' + logHtml

    epoch_loss.push(log.loss)
    document.getElementById('div_traininglog').innerHTML = logHtml
    document.getElementById('div_training_progressbar').style.width = Math.ceil(((epoch + 1) * (100 / n_epochs))).toString() + '%'
    document.getElementById('div_training_progressbar').innerHTML = Math.ceil(((epoch + 1) * (100 / n_epochs))).toString() + '%'

    const graph_plot = document.getElementById('div_linegraph_trainloss')
    Plotly.newPlot(graph_plot, [{ x: Array.from({ length: epoch_loss.length }, (v, k) => k + 1), y: epoch_loss, name: 'Loss' }], { margin: { t: 0 } })
  }

  const callback = async (log: { iterations: number, error: number}) => {
    callbackChar(log.iterations, { loss: log.error })
  }

  const { net, set, lastInput } = await trainNet({ symbol, tf, countCandels, callback, testCount, isUseSavedNet })
  console.log('NETWORK!', net)

  $('#div_container_validate').show()
  $('#div_container_predict').show()

  // onClickValidate(net, set, lastInput, testCount);
  predict(net, set, lastInput)
}