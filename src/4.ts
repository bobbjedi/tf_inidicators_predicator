function getResult (chests: number[], t: number): number {
  let counter = 0
  function calcPermutations (array: number[], k: number, times: number) {
    const m: number[][] = []
    const combinations: number[] = []
    const indices: boolean[] = []
    const len = array.length
    function run (level: number) {
      for (let i = 0; i < len; i++) {
        if (!indices[i]) {
          indices[i] = true
          combinations[level] = array[i]
          if (level < k - 1) {
            run(level + 1)
          } else {
            // m.push(([]).concat(combinations))
            const combo = combinations
            let t_ = times
            let myPoition = 0
            let score = 0

            // const chests = chests.slice()
            combo.forEach(position => {
              if (t_ <= 0) { return }
              const steps = Math.max(myPoition, position) - Math.min(myPoition, position)
              // console.log({ myPoition, position, steps })
              t_ -= steps
              myPoition = position
              if (t_ >= 1) {
                score += chests[position]
                t_--
              }
            })
            // console.log(combo, score)
            bestScore = Math.max(bestScore, score)
          }
          indices[i] = false
        }
      }
    }
    run(0)
    return m
  }
  const indexes: number[] = []
  let i = 0
  while (indexes.length < chests.length) {
    indexes.push(i++)
  }
  console.log('I>', indexes)
  // let combos: number[][] = []
  // let k = 0
  // while (k <= chests.length) {
  //   combos = combos.concat(calcPermutations(indexes, k++))
  // }

  // combos = combos.filter(c => {
  //   return c.reduce((r, num, i) => {
  //     return r
  //     && num < (c[i + 1] >= 0 ? c[i + 1] : Infinity)
  //   }, true)
  // })
  let bestScore = 0
  const combos = calcPermutations(indexes, Math.min(indexes.length, Math.ceil(t / 2)), t)
  console.log('combos', combos.length)

  // while (combos.length) {
  //   const combo = combos.pop()
  //   let t_ = t
  //   let myPoition = 0
  //   let score = 0
  //   // const chests = chests.slice()
  //   combo.forEach(position => {
  //     if (t_ <= 0) { return }
  //     const steps = Math.max(myPoition, position) - Math.min(myPoition, position)
  //     // console.log({ myPoition, position, steps })
  //     t_ -= steps
  //     myPoition = position
  //     if (t_ >= 1) {
  //       score += chests[position]
  //       t_--
  //     }
  //   })
  //   // console.log(combo, score)
  //   bestScore = Math.max(bestScore, score)
  // }
  return bestScore
  // Write your code here...
}

// const rnd = (min: number, max: number) => { // min and max included
//   return Math.floor(Math.random() * (max - min + 1) + min)
// }
// const inp: number[] = []
// while (inp.length < 100) {
//   inp.push(rnd(2, 10))
// }
// console.log('Result:', getResult(inp, 20))

function log (a?: any, b?: any, c?: any, d?: any) {
  console.log(...Array.from(arguments))
}

log('Test', 34, { s: 1 })