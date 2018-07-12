import promise from './src'

window.Promise = promise

function testGenerator () {
  const p = new Promise((resolve) => {
    setTimeout(() => resolve(`resolve promise`), 2000)
  })

  function * f() {
    const res = yield p
    console.assert(res === 'resolve promise', '[res] is not the expected value')
  }

  const g = f()
  g.next().value.then(res => g.next(res))
}

function testAsyncFun () {
  function resolve(val) {
    return new Promise(resolve => {
      setTimeout(() => {
        val++
        resolve(val)
      }, 2000)
    })
  }

  async function f() {
    let val = await resolve(10)
    let valTwo  = await resolve(val++)

    console.assert(valTwo === 12, '[valTwo] is not the expected value')
  }
  f()
}

testGenerator()
testAsyncFun()