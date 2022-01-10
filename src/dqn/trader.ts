import Agent from './Agent'
import $u, { Set } from '../utils'
import * as _ from 'underscore'

export default class Trader {
  symbol: string
  tf: number
  set: Set[]
  agent: Agent

  priceBuy = 0
  isHold = false

  rewardCounter = 0
  constructor (symbol: string, tf: number) {
    this.tf = tf
    this.symbol = symbol
  }

  async startTrade () {
    let candels = await $u.getCandels('binance', this.symbol, 1000, this.tf) //  баржа, пара, период, TF в минутах
    let i = 1
    while (i++ < 10) {
      console.log('End:', candels[0].open_time)
      candels = (await $u.getCandels('binance', this.symbol, 1000, this.tf, candels[0].open_time * 1000)).concat(candels)
    }
    const { set, lastInput } = $u.prepSet(candels)
    this.set = set
    this.initAgent()
    await this.goLearn()
  }
  initAgent () {
    // actions = 0 buy | 1 hold | 2 sell
    const tradeState = this.set[0].set.input.length
    // const statesCount = tradeState + 1 + 1 // isHold now, price of buy(if hold)
    const statesCount = tradeState
    this.agent = new Agent(statesCount, [64, 64], 0)
  }
  async goLearn () {
    const positive = this.set.filter(s => s.set.output[0] > 0.5)
    const negative = this.set.filter(s => s.set.output[0] < 0.5)
    const count = Math.min(positive.length, negative.length)
    _.shuffle(positive.splice(-count).concat(negative.splice(-count))).forEach((i) => {
    // this.set.forEach((i) => {
      const act = this.agent.act(i.set.input)
      const out_ = i.set.output[0]
      //   let o = 0
      //   if (out > 0.5) {
      const out = (out_ - 0.5) * 2
      //   console.log({ out, out_ })
      //   } else {
      // o = 0.5 - out
      //   }
      let rw = 0
      //   if (out < 0) {
      if (act === 2) { rw = -out } // sell
      if (act === 1) { rw = out / 2 } // hold
      if (act === 0) { rw = out * 2 } // buy
      this.rewardCounter += rw
      this.agent.reward(rw)

      let move = '_buy'
      if (act === 1) { move = 'hold' }
      if (act === 2) { move = 'sell' }
    //   rw < 0 && console.log(move, 'out:', out, rw)
      //   }
      //   if (out > 0.1) {
      //     if (act === 2) { return this.agent.reward(-out) } // bad sell
      //     if (act === 1) { return this.agent.reward(out) } // error hold
      //     if (act === 0) { return this.agent.reward(out * 2) } // error buy
      //   }
    })
    console.log('RW:', this.rewardCounter)
    this.rewardCounter = 0
    setTimeout(() => this.goLearn())
    // console.log('Agent READY')
  }
  run (state: number[]) {
    return this.agent.brain.actor.clearAct(state) as number
  }
}