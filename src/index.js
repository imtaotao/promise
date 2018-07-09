// States: 0 - pending, 1 - fulfilled, 2 - rejected, 3 - another promise

const asap = require('./asap')
const extensions = require('./extensions')
const noop = () => {}

module.exports = class Promise {
  constructor (fun) {
    if (!new.target) {
      throw TypeError('Promises must be constructed via new')
    }
    if (typeof fun !== 'function') {
      throw TypeError("Promise constructor's argument must be a function")
    }

    this._state = 0
    this._value = null
    this._deferreds = []

    if (fun === noop) return
    doResolve(fun, this)
  }

  then (onFulfilled, onRejected) {
    const p = new Promise(noop)
    handle(this, new Handler(p, onFulfilled, onRejected))

    return p
  }

  catch (onRejected) {
    return this.then(null, onRejected)
  }

  finally (fun) {
    return this.then(
      value => Promise.resolve(fun()).then(() => value),
      reason => Promise.resolve(fun()).then(() => { throw reason })
    )
  }

  toString () {
    return '[object Promise]'
  }
}

Promise._noop = noop

extensions(Promise)

function doResolve (fun, promise) {
  let done = false

  function _resolve (value) {
    if (done) return
    done = true
    resolve(promise, value)
  }

  function _reject (reason) {
    if (done) return
    done = true
    reject(promise, reason)
  }

  try {
    fun(_resolve, _reject)
  } catch (error) {
    _reject(error)
  }
}

function resolve (promise, newValue) {
  // https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
  if (promise === newValue) {
    reject(promise, new TypeError('A promise cannot be resolved with itself'))
    return
  }

  // 如果 newValue 是个对象或者函数
  if (
      newValue &&
      (typeof newValue === 'object' || typeof newValue === 'function')
  ) {
    // 尝试去拿到 newValue 的 then 方法，如果失败 then 方法会是一个 error
    const [isError, then] = getThen(newValue)
    if (isError) {
      reject(promise, then)
      return
    }

    // 如果 newValue 是一个 Promise 实例的话，状态为 3
    if (then === promise.then && newValue instanceof Promise) {
      promise._state = 3
      promise._value = newValue
      finale(promise)
      return
    } else if (typeof then === 'function') {
      doResolve(then.bind(newValue), promise)
      return
    }
  }

  promise._state = 1
  promise._value = newValue
  finale(promise)
}

function reject (promise, reason) {
  promise._state = 2
  promise._value = reason
  finale(promise)
}

function finale (promise) {
  if (promise._deferreds.length) {
    if (promise._deferreds.length === 1) {
      handle(promise, promise._deferreds[0])
      promise._deferreds = []
      return
    }

    for (const deferred of promise._deferreds) {
      handle(promise, deferred)
    }
    promise._deferreds = []
  }
}

function handle (promise, deferred) {
  // 如果 promise 的状态为 3
  while (promise._state === 3) {
    promise = promise._value
  }

  // 如果 promise 的状态为 0，一般情况下 _state 都为 0，除非 resolve 为同步代码
  if (promise._state === 0) {
    promise._deferreds.push(deferred)
    return
  }

  handleResolved(promise, deferred)
}

function handleResolved (promise, deferred) {
  // 异步调用，优先通过微任务调用
  asap(() => {
    const isResolve = promise._state === 1
    const callback = deferred[isResolve ? 'onFulfilled' : 'onRejected' ]

    // 如果当期 deferred 的回调为 null 就把当前 promise._value 为值继续往下找
    if (callback === null) {
      isResolve
        ? resolve(deferred.promise, promise._value)
        : reject(deferred.promise, promise._value)
      return
    }

    try {
      const result = callback(promise._value)
      resolve(deferred.promise, result)
    } catch (error) {
      reject(deferred.promise, error)
    }
  })
}

function getThen (value) {
  try {
    return [false, value.then]
  } catch (error) {
    return [true, error]
  }
}

function Handler (promise, onFulfilled, onRejected) {
  this.promise = promise
  this.onFulfilled = typeof onFulfilled === 'function'
    ? onFulfilled
    : null
  this.onRejected = typeof onRejected === 'function'
    ? onRejected
    : null
}