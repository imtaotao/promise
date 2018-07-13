const Promise = require('./build/promise.esm.js')

exports.deferred = function ()  {
  let resolve, reject
  const promise = new Promise(function (_resolve, _reject) {
    resolve = _resolve
    reject = _reject
  })
  return {
    promise,
    resolve,
    reject,
  }
}

exports.resolved = Promise.resolve
exports.rejected = Promise.reject