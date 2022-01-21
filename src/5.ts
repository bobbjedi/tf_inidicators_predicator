/**
 * Implement function getResult
 */
function getResult (calendar: number, dateOfBirth: number, name_: string, phrases: string[]): boolean {
  // Write your code here...
  const [age, inputName] = phrases
  if (dateOfBirth + +age !== calendar && dateOfBirth + +age + 1 !== calendar) { return false }
  return getEditDistance(inputName.toLowerCase(), name_.toLowerCase()) < 2
}

function getEditDistance (a: string, b: string) {
  if (a.length === 0) { return b.length }
  if (b.length === 0) { return a.length }
  var matrix = [],
    i
  for (i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  var j
  for (j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }
  for (i = 1; i <= b.length; i++) {
    for (j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1))
      }
    }
  }

  return matrix[b.length][a.length]
}

const calendar = 1984
const date_of_birth = 1950
const name_ = 'Anna'
const phrases = ['34', 'Ana']

console.log(getResult(calendar, date_of_birth, name_, phrases))

const rnd = (min: number, max: number) => { // min and max incsluded
  return Math.floor(Math.random() * (max - min + 1) + min)
}
function log (a?: any, b?: any, c?: any, d?: any) {
  // if (typeof process === 'undefined') { return }
  console.log(...Array.from(arguments))
}
// log(1, 2, 3)