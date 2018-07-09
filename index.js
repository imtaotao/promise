import promise from './src'

window.Promise = promise
// function getP () {
//   return new promise((resolve, reject) => {
//     setTimeout(() => resolve(111), 3000)
//   })
// }
// var a = getP()
// a.then(res => console.log('res', res))
var b = new promise((re, rj) => {
  // setTimeout(() => re(111), 2000)
  re(111)
})
setTimeout(() => {
 console.log(222);
});
b.then(res => console.log(res))
.then(res => console.log(res))

// function getP () {
//   return new promise((resolve, reject) => {
//     setTimeout(() => resolve(111), 3000)
//   })
// }
// var a = getP()
// a.then(res => console.log('res', res))
// var b = new promise((re, rj) => {
//   setTimeout(() => re(a), 1000)
// })

// b.then(res => console.log(res))