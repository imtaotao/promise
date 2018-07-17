// States: 0 - pending, 1 - fulfilled, 2 - rejected, 3 - another promise
import ascb from './async_callback'
const noop = () => {}

export default class Promise {
  constructor (fun) {
    if (!(this instanceof Promise)) {
      throw TypeError('Calling a Promise constructor without new is forbidden')
    }
    if (typeof fun !== 'function') {
      throw TypeError("Promise constructor's argument must be a function")
    }

    this._state = 0
    this._value = null
    this._deferreds = null

    if (fun === noop) return
    doResolve(fun, this)
  }

  /**
   * 本来 prototype method 应该需要判断 this，
   * 如果 this 不符合要求应该 throw TypeError，
   * example:
   *  const { then } = promise.then
   *  then(f, r) // TypeError: ...
   */
  then (onFulfilled, onRejected) {
    /**
     * 每次都会返回一个新的 promise 出去
     * 而当前上下文会有个 deferred 队列
     * 每个 deferred 都会保存这个 return 出去的 promise 和回调
     */
    const p = new Promise(noop)
    handle(this, new Handler(p, onFulfilled, onRejected))

    return p
  }

  catch (onRejected) {
    return this.then(null, onRejected)
  }

  finally (fun) {
    // 用 Promise.resolve 包裹起来的原因是，fun 有可能返回的是一个 promise
    return this.then(
      value => Promise.resolve(fun()).then(() => value),
      reason => Promise.resolve(fun()).then(() => { throw reason })
    )
  }

  getValue () {
    if (this._state === 3) {
      return this._value.getValue()
    }

    return this._value
  }

  toString () {
    return '[object Promise]'
  }
}

Promise._noop = noop

function doResolve (fun, promise) {
  let done = false

  // 立个 flag 保证不能重复调用 resolve 或者 reject
  // 因为 promise 的 state 一旦改变，就再也不可能改变了
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
  // 规范关于 resolve 的描述 https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
  /**
   * newValue 有可能有以下几种情况
   * 1. 当前上下文自己，这种情况直接报个错
   * 2. object 或者 function
   *    这种情况需要去尝试那 newValue 的 then 方法
   *    如果拿不到，那就代表是个正常的对象或者函数
   *    a. 如果 newValue 是一个新的 promise，需要根据新的 promise 的 state 来更改，此时当前 promise 的 state 为 3
   *    b. 如果 newValue 是带 then 方法的对象({ then () {} })，
   *       需要把这个 then 方法当成 promise 的构造函数的参数进行调用（可以在浏览器控制台用原生 promise 的测试下）
   * 3. 其他的值，state 改为 1
  */
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

    // 如果 newValue 是一个 Promise 实例的话，state 为 3
    if (then === promise.then && newValue instanceof Promise) {
      promise._state = 3
      promise._value = newValue
      finale(promise)
      return
    } else if (typeof then === 'function') {
      // 规范上说的就是需要把 newValue 当成上下文进行调用
      doResolve(then.bind(newValue), promise)
      return
    }
  }

  promise._state = 1
  promise._value = newValue
  finale(promise)
}

function reject (promise, reason) {
  // 改变 state 和 value
  promise._state = 2
  promise._value = reason
  finale(promise)
}

function finale (promise) {
  /**
   * 1.如果当前 promise 没有 deferreds，代表 resolve 是通过同步进行调用的
   * 此时 promise 的 state 已经改变，value 也已经拿到，不需要做什么事情
   * 2.如果 deferreds 是存在的，就需要对每个 deferreds 进行处理
  */
  if (promise._deferreds) {
    if (promise._deferreds.length === 1) {
      handle(promise, promise._deferreds[0])
      promise._deferreds = null
      return
    }

    for (const deferred of promise._deferreds) {
      handle(promise, deferred)
    }
    promise._deferreds = null
  }
}

/**
 * handle 方法供两个接口调用，finale 和 then
 * 它也提供了两种功能，对传进来的 promise 添加 deferred 或者 调用 deferred 的回调
 */
function handle (promise, deferred) {
  /**
   * 如果 promise 的 state 为 3，拿到最底层的 promise
   * 因为需要把 deferred 转移到最底层的 promise 上
   * 这样当前上下文（promise）添加的 then 就会随着最底层的 promise 的 state 改变而改变
  */
  while (promise._state === 3) {
    promise = promise._value
  }

  /**
   * 如果通过 then 方法走到这里，一般情况下 state 都为 0，除非 resolve 为同步代码
   * 如果通过 finale 方法走到这里，state 肯定 1 或者 2，出发经过了 while 循环，底层的 promise 状态还为 0
   */
  if (promise._state === 0) {
    promise._deferreds
      ? promise._deferreds.push(deferred)
      : (promise._deferreds = [deferred])
    return
  }

  /**
   * 1.如果是通过 finale 走到这里
   *  此时 promise.state 为 1 或者 2
   * 2.如果是通过 then 方法走到这里
   *  此时 promise.state 为 1 或者 2，promise.deferred 为 null
   *  但是可以直接用 handle 参数（promise, deferred）进行调用
  */
  handleResolved(promise, deferred)
}

function handleResolved (promise, deferred) {
  // 异步调用，优先通过微任务调用
  ascb(() => {
    const isResolve = promise._state === 1
    const callback = deferred[isResolve ? 'onFulfilled' : 'onRejected']

    // 如果当期 deferred 的回调为 null 就把当前 promise._value 为值继续往下找
    if (callback === null) {
      isResolve
        ? resolve(deferred.promise, promise._value)
        : reject(deferred.promise, promise._value)
      return
    }

    try {
      /**
       * 如果外面是 then 形式的链式调用，此时的 deferred.promise 应该是
       * {
       *  deferred: [不为空的数组],
       *  state: 0,
       *  value: null,
       * }
      */
      const result = callback(promise._value)

      /**
       * 经过 resolve 之后，deferred.promise 应该是
       * {
       *   deferred: [不为空的数组],
       *   state: 1 或者 2 或者 3,
       *   value: xx
       * }
       * 然后走 finale 就可以完成链式操作了
       */
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

// 一个 deferred 对象应该为 { promise, onFulfilled, onRejected }
function Handler (promise, onFulfilled, onRejected) {
  this.promise = promise
  this.onFulfilled = typeof onFulfilled === 'function'
    ? onFulfilled
    : null
  this.onRejected = typeof onRejected === 'function'
    ? onRejected
    : null
}