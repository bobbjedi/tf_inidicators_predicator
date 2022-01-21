
const getUsers = (fightersStamina: number[]) => {
  let id = 0
  const users: {id: number, stamina: number}[] = []
  while (id < 4) {
    users.push({
      id,
      stamina: fightersStamina[id]
    })
    id++
  }
  return users
}
const u = getUsers([1])
  type User = typeof u[0];
const getCombos = (user: User, enemy: User[]) => {
  return [
    [[user, enemy[0]], [enemy[1], enemy[2]]],
    [[user, enemy[1]], [enemy[0], enemy[2]]],
    [[user, enemy[2]], [enemy[1], enemy[0]]],
  ]
}
const fight = (user1: User, user2: User) => {
  if (user1.stamina === user2.stamina) {
    user1.stamina = 0
    user2.stamina = 0
    return { winer: user1, rate: .5 }
  }
  if (user1.stamina > user2.stamina) {
    user1.stamina -= user2.stamina
    return { winer: user1, rate: 1 }
  }
  user2.stamina -= user1.stamina
  return { winer: user2, rate: 0 }
}
function getResult (fightersStamina: number[]): number[] {
  const pss: number[][] = []
  let i = 0
  console.log(fightersStamina)
  while (i < 4) {
    const users = getUsers(fightersStamina)
    const users_ = users.slice()
    const user = users.splice(i, 1)[0]
    const combos = getCombos(user, users)
    const ps: number[] = []
    combos.forEach(ver => {
      users_.forEach(u => u.stamina = fightersStamina[u.id])
      console.log('---------', ps)
      let p = 1
      console.log('ffff 1', user, ver[0][1])
      const f1 = fight(user, ver[0][1])
      console.log('wnner 1', f1.winer)
      if (f1.winer === user) {
        p *= f1.rate
        console.log('UP RATE *', f1.rate, ' = ', p)
      } else {
        console.log('lose 1', ver[0][1].id)
        ps.push(0)
        return
      }
      console.log('second group fight', ver[1][0], ver[1][1])
      const win = fight(ver[1][0], ver[1][1]).winer
      console.log('secong group win', win)
      console.log('ffff 2', user, win)
      const f2 = fight(user, win)
      console.log(' 2 winer', f2.winer)
      if (f2.winer === user) {
        console.log('f2 Rate vs', ver[1][1].id, f1.rate)
        p *= f2.rate
      } else {
        console.log('lose 2')
        p = 0
      }
      ps.push(p)
    })
    console.log('>>>winRate>', '#' + user.id, ps)
    pss.push(ps)
    // usersRate.push(p)
    i++
  }
  console.log(pss)
  return pss.map(p => {
    return Math.round(p.reduce((s, c) => {
      return s + c
    }, 0) / .03)
  })

}

const fightersStamina = [2, 1, 0, 2]
// const fightersStamina = [1, 0, 3, 4]

console.log(getResult(fightersStamina))