import $u, { Set, LastInput, getInterval } from './utils'
import * as _ from 'underscore'
import { Log, trainNet } from './network'

const Plotly: any = (window as any).Plotly

document.addEventListener('DOMContentLoaded', () => onClickTrainModel('USDT-BTC', 15, 1000, 500))

function onClickValidate (brainNet: any, set: Set[], lastInput: LastInput, testCount: number) {

  $('#div_container_validating').show()
  $('#load_validating').show()
  $('#btn_validation').hide()

  const times = set.map(s => s.time)
  const prices = set.map(s => s.price)
  const inputs = set.map(s => s.set.input)
  const outputs = set.map(s => s.set.output[0])

  const knownTimes = times.slice()
  const unknownOutputs = inputs.splice(-testCount).concat([lastInput.inp]).map(i => brainNet.run(i)[0])
  const unknownTimes = knownTimes.splice(-testCount).concat($u.formatDate(lastInput.unix))
  const knownOutputs = inputs.map(i => brainNet.run(i)[0])

  // const knownOutputs = inputs

  console.log('Inputs:', inputs)
  console.log('Outputs:', outputs)
  console.log('knownOutputs:', knownOutputs)
  console.log('times:', times)
  console.log('prices:', prices)

  console.log({ lastInput, t: $u.formatDate(lastInput.unix) })
  // const maxPrice = Math.max(...prices);
  const graph_plot = document.getElementById('div_validation_graph')
  Plotly.newPlot(graph_plot, [{ x: times.concat($u.formatDate(lastInput.unix)), y: $u.normalizeArr(prices.concat(lastInput.price)), name: 'Price' }], { margin: { t: 0 } })
  Plotly.plot(graph_plot, [{ x: times, y: outputs, name: 'Outputs set' }], { margin: { t: 0 } })
  Plotly.plot(graph_plot, [{ x: knownTimes, y: $u.normalizeArr(knownOutputs), name: 'predict Known' }], { margin: { t: 0 } })
  Plotly.plot(graph_plot, [{ x: unknownTimes, y: $u.normalizeArr(unknownOutputs), name: 'predict Unknown' }], { margin: { t: 0 } })
  // Plotly.plot(graph_plot, [{ x: times, y: prices.map(e => 0.5).map(p => p * 3000), name: 'Middle line' }], { margin: { t: 0 } });
  $('#load_validating').hide()
  // onClickPredict();
}

async function onClickTrainModel (symbol: string, tf: number, countCandels: number, testCount: number) {

  const epoch_loss: string[] = []
  $('#div_container_training').show()
  $('#btn_draw_trainmodel').hide()
  $('#set-info').html(`<b>${symbol}, tf: ${getInterval('binance', tf)}</b>`)

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

  const callback = async (log: Log) => {
    callbackChar(log.iterations, { loss: log.error })
  }

  const { net, set, lastInput } = await trainNet({ symbol, tf, countCandels, callback, testCount })
  console.log('NETWORK!', net)

  $('#div_container_validate').show()
  $('#div_container_predict').show()

  onClickValidate(net, set, lastInput, testCount)
}