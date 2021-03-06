var capacity = 1024;
var queue = [];
var index = 0;
var flushing = false;
var requestFlush = void 0;
var BrowserMutationObserver = void 0;
var isNode = typeof module !== 'undefined' && module.exports;
function createMutationObserverCallback(callback) {
  var toggle = 1;
  var observer = new BrowserMutationObserver(callback);
  var node = document.createTextNode('');
  observer.observe(node, { characterData: true });
  return function () {
    toggle = -toggle;
    node.data = toggle;
  };
}
function createTimerCallback(callback) {
  return function () {
    var t = setTimeout(handleTimer);
    var i = setInterval(handleTimer, 50);
    function handleTimer() {
      clearTimeout(t);
      clearInterval(i);
      t = null;
      i = null;
      callback();
    }
  };
}
function setImmediateOrNexttick(callback) {
  return function () {
    if (flushing && typeof setImmediate === 'function') {
      setImmediate(callback);
    } else {
      process.nextTick(callback);
    }
  };
}
if (isNode) {
  requestFlush = setImmediateOrNexttick(_requestFlush);
} else {
  var scope = typeof global !== 'undefined' ? global : self;
  BrowserMutationObserver = scope.MutationObserver || scope.WebKitMutationObserver;
  requestFlush = typeof BrowserMutationObserver === 'function' ? createMutationObserverCallback(_requestFlush) : createTimerCallback(_requestFlush);
}
function _requestFlush() {
  while (index < queue.length) {
    var currentIndex = index;
    index++;
    queue[currentIndex].call();
    if (index > capacity) {
      var newLength = queque.length - index;
      for (var i = 0; i < newLength; i++) {
        queue[i] = queue[index + i];
      }
      queue.length -= index;
      index = 0;
    }
  }
  queue.length = 0;
  index = 0;
  flushing = false;
}
function ascb(task) {
  if (!queue.length) {
    requestFlush();
    flushing = true;
  }
  queue[queue.length] = task;
}

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
};

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

var slicedToArray = function () {
  function sliceIterator(arr, i) {
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;

    try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"]) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  return function (arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if (Symbol.iterator in Object(arr)) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }
  };
}();

var noop = function noop() {};

var Promise$1 = function () {
  function Promise(fun) {
    classCallCheck(this, Promise);

    if (!(this instanceof Promise)) {
      throw TypeError('Calling a Promise constructor without new is forbidden');
    }
    if (typeof fun !== 'function') {
      throw TypeError("Promise constructor's argument must be a function");
    }
    this._state = 0;
    this._value = null;
    this._deferreds = null;
    if (fun === noop) return;
    doResolve(fun, this);
  }

  createClass(Promise, [{
    key: 'then',
    value: function then(onFulfilled, onRejected) {
      var p = new Promise(noop);
      handle(this, new Handler(p, onFulfilled, onRejected));
      return p;
    }
  }, {
    key: 'catch',
    value: function _catch(onRejected) {
      return this.then(null, onRejected);
    }
  }, {
    key: 'finally',
    value: function _finally(fun) {
      return this.then(function (value) {
        return Promise.resolve(fun()).then(function () {
          return value;
        });
      }, function (reason) {
        return Promise.resolve(fun()).then(function () {
          throw reason;
        });
      });
    }
  }, {
    key: 'getValue',
    value: function getValue() {
      if (this._state === 3) {
        return this._value.getValue();
      }
      return this._value;
    }
  }, {
    key: 'toString',
    value: function toString() {
      return '[object Promise]';
    }
  }]);
  return Promise;
}();

Promise$1._noop = noop;
function doResolve(fun, promise) {
  var done = false;
  function _resolve(value) {
    if (done) return;
    done = true;
    resolve(promise, value);
  }
  function _reject(reason) {
    if (done) return;
    done = true;
    reject(promise, reason);
  }
  try {
    fun(_resolve, _reject);
  } catch (error) {
    _reject(error);
  }
}
function resolve(promise, newValue) {
  if (promise === newValue) {
    reject(promise, new TypeError('A promise cannot be resolved with itself'));
    return;
  }
  if (newValue && ((typeof newValue === 'undefined' ? 'undefined' : _typeof(newValue)) === 'object' || typeof newValue === 'function')) {
    var _getThen = getThen(newValue),
        _getThen2 = slicedToArray(_getThen, 2),
        isError = _getThen2[0],
        then = _getThen2[1];

    if (isError) {
      reject(promise, then);
      return;
    }
    if (then === promise.then && newValue instanceof Promise$1) {
      promise._state = 3;
      promise._value = newValue;
      finale(promise);
      return;
    } else if (typeof then === 'function') {
      doResolve(then.bind(newValue), promise);
      return;
    }
  }
  promise._state = 1;
  promise._value = newValue;
  finale(promise);
}
function reject(promise, reason) {
  promise._state = 2;
  promise._value = reason;
  finale(promise);
}
function finale(promise) {
  if (promise._deferreds) {
    if (promise._deferreds.length === 1) {
      handle(promise, promise._deferreds[0]);
      promise._deferreds = null;
      return;
    }
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = promise._deferreds[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var deferred = _step.value;

        handle(promise, deferred);
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator.return) {
          _iterator.return();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }

    promise._deferreds = null;
  }
}
function handle(promise, deferred) {
  while (promise._state === 3) {
    promise = promise._value;
  }
  if (promise._state === 0) {
    promise._deferreds ? promise._deferreds.push(deferred) : promise._deferreds = [deferred];
    return;
  }
  handleResolved(promise, deferred);
}
function handleResolved(promise, deferred) {
  ascb(function () {
    var isResolve = promise._state === 1;
    var callback = deferred[isResolve ? 'onFulfilled' : 'onRejected'];
    if (callback === null) {
      isResolve ? resolve(deferred.promise, promise._value) : reject(deferred.promise, promise._value);
      return;
    }
    try {
      var result = callback(promise._value);
      resolve(deferred.promise, result);
    } catch (error) {
      reject(deferred.promise, error);
    }
  });
}
function getThen(value) {
  try {
    return [false, value.then];
  } catch (error) {
    return [true, error];
  }
}
function Handler(promise, onFulfilled, onRejected) {
  this.promise = promise;
  this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null;
  this.onRejected = typeof onRejected === 'function' ? onRejected : null;
}

Promise$1.resolve = function (value) {
  if (value instanceof Promise$1) return value;
  function valueToPromise(val) {
    var p = new Promise$1(Promise$1._noop);
    p._state = 1;
    p._value = value;
    return p;
  }
  if ((typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object' || typeof value === 'function') {
    try {
      var then = value.then;
      if (typeof then === 'function') {
        return new Promise$1(then.bind(value));
      }
    } catch (error) {
      return new Promise$1(function (_, reject) {
        reject(error);
      });
    }
  }
  return valueToPromise(value);
};
Promise$1.reject = function (reason) {
  return new Promise$1(function (_, reject) {
    reject(reason);
  });
};
Promise$1.all = function (array) {
  !Array.isArray(array) && (array = Array.from(array));
  return new Promise$1(function (resolve, reject) {
    if (array.length === 0) return resolve(array);
    var remaining = array.length;
    for (var i = 0; i < array.length; i++) {
      result(array[i], i);
    }
    function result(val, i) {
      if (!val || (typeof val === 'undefined' ? 'undefined' : _typeof(val)) !== 'object' && typeof val !== 'function') {
        array[i] = val;
        --remaining === 0 && resolve(array);
        return;
      }
      if (val instanceof Promise$1 && val.then === Promise$1.prototype.then) {
        while (val._state === 3) {
          val = val._value;
        }
        if (val._state === 1) return result(val._value, i);
        if (val._state === 2) reject(val._value);
        val.then(function (res) {
          return result(res, i);
        }, reject);
        return;
      }
      if (typeof val.then === 'function') {
        var p = new Promise$1(val.then.bind(val));
        p.then(function (res) {
          return result(res, i);
        }, reject);
        return;
      }
    }
  });
};
Promise$1.race = function (array) {
  return new Promise$1(function (resolve, reject) {
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = array[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var val = _step.value;

        Promise$1.resolve(val).then(resolve, reject);
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator.return) {
          _iterator.return();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }
  });
};

export default Promise$1;
