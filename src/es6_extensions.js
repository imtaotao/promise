const Promise = require('./index')
module.exports = Promise

Promise.resolve = function (value) {
  // 这样实现其实与 es6 规范描述的 promise.resolve 实现是一样的
  if (value instanceof Promise) return value

  function valueToPromise (val) {
    const p = new Promise(Promise._noop)
    p._state = 1
    p._value = value

    return p
  }

  if (typeof value === 'object' || typeof value === 'function') {
    try {
      // 如果 value 是一个包含 then 方法的对象
      const then = value.then
      if (typeof then === 'function') {
        return new Promise(then.bind(value))
      }
    } catch (error) {
      return new Promise((_, reject) => { reject(error) })
    }
  }

  return valueToPromise(value)
}

Promise.reject = function (reason) {
  return new Promise((_, reject) => {
    reject(reason)
  })
}

Promise.all = function (array) {
  !Array.isArray(array) && (array = Array.from(array))

  return new Promise((resolve, reject) => {
    if (array.length === 0) return resolve(array)

    let remaining = array.length
    for (let i = 0; i < array.length; i++) {
      result(array[i], i)
    }

    function result (val, i) {
      // 如果 val 是一个正常的值
      if (!val || (typeof val !== 'object' && typeof val !== 'function')) {
        array[i] = val
        --remaining === 0 && resolve(array)
        return
      }

      // 如果 val 是一个 promise
      if (val instanceof Promise && val.then === Promise.prototype.then) {
        while (val._state === 3) {
          val = val._value
        }

        // Promise.all 被拒绝并不影响每个单独的 promise 继续执行
        if (val._state === 1) return result(val._value, i)
        if (val._state === 2) reject(val._value)
        val.then(res => result(res, i), reject)
        return
      }

      // 如果 val 是一个包含 then 方法的对象
      if (typeof val.then === 'function') {
        const p = new Promise(val.then.bind(val))
        p.then(res => result(res, i), reject)
        return
      }
    }
  })
}

Promise.race = function (array) {
  return new Promise((resolve, reject) => {
    for (const val of array) {
      Promise.resolve(val).then(resolve, reject)
    }
  })
}