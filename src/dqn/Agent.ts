import FT, { Spec, Env } from './dqnFT'

export default class {
  brain: FT
  rewardCounter = 0
  constructor (statesCount: number, num_hidden_layers: number[], actionsCount: number) {
    const spec: Spec = {
      arch: 'p',
      update: 'qlearn', // qlearn | sarsa
      gamma: 0.9, // discount factor, [0, 1)
      epsilon: 0.2, // initial epsilon for epsilon-greedy policy, [0, 1)
      alpha: 0.005, // value function learning rate
      experience_add_every: 5, // :5. number of time steps before we add another experience to replay memory
      experience_size: 10000, // size of experience
      learning_steps_per_iteration: 5, // =20 better but slowly
      tderror_clamp: 1.0, // for robustness
      num_hidden_layers // number of neurons in hidden layer
    }
    const env: Env = {
      getMaxNumActions: () => actionsCount,
      getNumStates: () => statesCount,
    }
    this.brain = new FT(env, spec, 5)

  }
  act (state: number[]) {
    return this.brain.act(state)
  }
  reward (rw: number) {
    this.brain.learn(rw)
    this.rewardCounter += rw
  }
}