import $u, { Set, LastInput, getInterval } from './utils'
import * as _ from 'underscore'
import { Log, trainNet } from './network'

const Plotly: any = (window as any).Plotly

document.addEventListener('DOMContentLoaded', () => onClickTrainModel('USDT-BTC', 720, 1000, 500))

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

  const { prices, buy, sell, times } = await trainNet({ symbol, tf_: tf, countCandels, callback, testCount })
  console.log({ prices, buy, sell, times })

  $('#div_container_validate').show()
  $('#div_container_predict').show()
  $('#div_container_validating').show()
  $('#load_validating').show()
  $('#btn_validation').hide()

  const graph_plot = document.getElementById('div_validation_graph')
  const pricesMax = Math.max(...prices)
  const pricesMin = Math.min(...prices)
  console.log({ pricesMax, pricesMin })
  const avg = (pricesMin + pricesMax) / 2
  Plotly.newPlot(graph_plot, [{ x: times.map($u.formatDate), y: prices, name: 'Price' }], { margin: { t: 0 } })
  Plotly.plot(graph_plot, [{ x: [], y: [] }])
  Plotly.plot(graph_plot, [{ x: times.map($u.formatDate), y: buy.map((r, i) => r ? prices[i] : 0), name: 'Buy' }], { margin: { t: 0 } })
  // Plotly.plot(graph_plot, [{ x: times.map($u.formatDate), y: sell.map(r => r ? pricesMin * 1.1 : avg), name: 'Sell' }], { margin: { t: 0 } })
  $('#load_validating').hide()

  // onClickValidate()
}