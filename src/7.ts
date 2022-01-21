/**
 * Implement function getResult
 */
const prices = {
  '3,4': 17,
  '2,3,4': 32,
  '2,4': 10,
  '1,3,4': 40,
  '1,2,3,4': 63,
  '1,2,4': 31,
  '1,3': 15,
  '1,2,3': 29,
  '1,2': 13,
  '1,4': 20,
  '2,3': 21,
}
function getResult (scheme: string[]): number {
  // Write your code here...
  let price = 0
  const matrix = scheme.map(l => l.split('-'))
  for (let lineNum = 0; lineNum < matrix.length; lineNum++) {
    console.log(lineNum, matrix[lineNum])
    const line = matrix[lineNum]
    for (let colNum = 0; colNum < line.length; colNum++) {
      const v = line[colNum]
      if (v === '0') { continue }
      // const wind = [
      //   matrix[lineNum - 1]?.[colNum - 1], matrix[lineNum - 1]?.[colNum], matrix[lineNum - 1]?.[colNum + 1],
      //   matrix[lineNum]?.[colNum - 1], matrix[lineNum][colNum], matrix[lineNum]?.[colNum + 1],
      //   matrix[lineNum + 1]?.[colNum - 1], matrix[lineNum + 1]?.[colNum], matrix[lineNum + 1]?.[colNum + 1],
      // ]
      const wind = [
        matrix[lineNum - 1]?.[colNum],
        matrix[lineNum]?.[colNum - 1], matrix[lineNum]?.[colNum + 1],
        matrix[lineNum + 1]?.[colNum],
      ]
      price += getPrice(wind)
      console.log(getPrice(wind))
    }

  }
  return price
}

const getPrice = (arr: string[]) => {
  const cl = arr.map((e, i) => (e === undefined || e === '1') ? i + 1 : -1).filter(e => ~e)
  console.log('CL', cl.toString())
  return prices[cl.toString() as any]
}

const scheme = [
  '0-0-0-0',
  '1-1-1-0',
  '0-0-1-0',
  '0-0-1-0']

console.log('>>', getResult(scheme))