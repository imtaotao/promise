const Promise = require('./index')

module.exports = function extensions (Promise) {
  Promise.resolve = function (value) {
    // 这样实现其实与 es6 规范描述的 promise.resolve 实现是一样的
    if (value instanceof Promise) return value

    if (typeof value !== 'object' && typeof value !== 'function') {
      const p = new Promise(Promise._noop)
      p._state = 1
      p._value = value
      return p
    }

    try {
      const then = value.then
      if (typeof then === 'function') {
        return new Promise(then.bind(value))
      }
    } catch (error) {
      return new Promise((_, reject) => { reject(error) })
    }
  }

  Promise.reject = function (reason) {
    return new Promise((_, reject) => { reject(reason) })
  }

  Promise.all = function (array) {
    return new Promise((resolve, reject) => {
      const length = array.length
      for (let i = 0; i < length; i++) {
        res(array[i], i)
      }

      function res (val, i) {

      }
    })
  }
}