const capacity = 1024
const queue = []
let index = 0
let flushing = false
let requestFlush

const isNodeFun = typeof process !== 'undefined' || typeof setImmediate !== undefined

// MutationObserver
function createMutationObserverCallback (callback) {
  let toggle = 1
  const observer = new BrowserMutationObserver(callback)
  const node = document.createTextNode('')
  observer.observe(node, {characterData: true})
  return () => {
    toggle = -toggle
    node.data = toggle
  }
}

// Timer
function createTimerCallback (callback) {
  return () => {
    let t = setTimeout(handleTimer)
    let i = setInterval(handleTimer, 50)
    function handleTimer () {
      clearTimeout(t)
      clearInterval(i)
      t = null
      i = null
      callback()
    }
  }
}

// node
function setImmediateOrNexttick (callback) {
  return () => {
    if (flushing && hasSetImmediate) {
      setImmediate(callback);
    } else {
      process.nextTick(callback);
    }
  }
}

if (isNodeFun) {
  requestFlush = setImmediateOrNexttick(_requestFlush)
} else {
  const scope = typeof global !== 'undefined' ? global : self
  const BrowserMutationObserver = scope.MutationObserver || scope.WebKitMutationObserver

  requestFlush = typeof BrowserMutationObserver === "function"
    ? createMutationObserverCallback(_requestFlush)
    : createTimerCallback(_requestFlush)
}

function _requestFlush () {
  while (index < queue.length) {
    const currentIndex = index

    index++
    queue[currentIndex].call()

    // 因为task里面可能继续添加队列，所以如果大于限定的值，需要做处理
    if (index > capacity) {
      const newLength = queque.length - index
      // 把队列后面的 task 全部移到前面，然后把后面的删掉，从头继续开始便利调用
      for (let i = 0; i < newLength; i++) {
        queue[i] = queue[index + i]
      }

      queue.length -= index
      index = 0
    }
  }

  // 遍历完成后，清空
  queue.length = 0
  index = 0
  flushing = false
}

module.exports = function rawAsap(task) {
  if (!queue.length) {
    requestFlush()
    flushing = true
  }

  queue[queue.length] = task
}