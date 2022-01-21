/**
 * Implement function getResult
 */
function getResult (s: string, symbol: string): number {

  let result = s

  // const isWhile = true
  // while (isWhile) {
  const parts = result.split(' ')
  const vals = parts.map((st, id) => {
    console.log(id, st[0])
    return {
      count: st.length,
      valid: st[0] === symbol,
      id
    }
  })
  // console.log(c)
  let bleckListPos: number[] = []
  const tryChage = (): number => {
    if (vals.length === 1) { return vals[0].count }
    const maxL = vals.filter((el, i) => !bleckListPos.includes(i) && el.valid).sort((a, b) => b.count - a.count)[0]

    if (!maxL) {
      console.log('OFF', vals)
      return vals.filter((el, i) => el.valid).sort((a, b) => b.count - a.count)[0].count
    }

    const index = vals.findIndex(v => v.id === maxL.id)
    let bestSideIndex = -1
    if (index === 0) { bestSideIndex = 1 }
    else if (index === vals.length - 1) {
      console.log('case 2', vals.length - 1)
      bestSideIndex = vals.length - 2 }
    else {
      console.log('Case', index - 1, index + 1)
      bestSideIndex = vals[index - 1].count < vals[index + 1].count
        ? index - 1
        : index + 1
    }
    console.log('-------------')
    console.log('My i', index, 'Best i', bestSideIndex)
    vals.forEach(e => console.log(e))
    if (vals[bestSideIndex].count <= maxL.count) {
      bleckListPos = []
      vals[index].count += vals[bestSideIndex].count + 1
      const rm = vals.splice(bestSideIndex, 1)[0]
      console.log('!!! rm: #', bestSideIndex, rm.count, 'vals len', vals.length,)
      vals.forEach(e => console.log(e))
    } else {
      console.log('addToBl #', index, 'mycount:', maxL.count, 'other co', vals[bestSideIndex].count)
      bleckListPos.push(index)
    }
    return tryChage()
  }
  return tryChage()
}

console.log('>>', getResult('aaa bbbb ssss ccc aa c', 'a'))