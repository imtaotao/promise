const capacity = 1024
const queue = []
let index = 0
let flushing = false
let requestFlush
let BrowserMutationObserver

const platform = typeof process !== 'undefined'
  ? process.title || 'browser'
  : 'browser'

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

    // 由于 timeout 在 firefox 的 worker 线程中可能会出现 bug
    // 为了防止 timeout 不触发，用 interval 预防
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
    /**
     * 由于没有办法真正添加为 microtask，即使在 node 中，promise task 会被添加到 nextTickQueue
     * 以下原因导致优先采用 setTmmediate
     *  1. 为了保证 promise 最好不能在 nextTick 前面被调用，nextTick 会在 poll 阶段之前被调用
     *  2. setTmmediate 会在 poll 阶段结束后被调用，而在 node 中，promise 应用大部分情况都是处理 io
     *  3. process.nextTick 递归会导致 event loop 被锁死，而 setImmediate 不会
     */
    if (flushing && typeof setImmediate === 'function') {
      setImmediate(callback)
    } else {
      process.nextTick(callback)
    }
  }
}

if (platform.includes('node')) {
  requestFlush = setImmediateOrNexttick(_requestFlush)
} else {
  const scope = typeof global !== 'undefined' ? global : self
  BrowserMutationObserver = scope.MutationObserver || scope.WebKitMutationObserver

  // MutationObserver 会新建个 microtask，与 promise 最契合
  // 备用选择 timeout
  requestFlush = typeof BrowserMutationObserver === 'function'
    ? createMutationObserverCallback(_requestFlush)
    : createTimerCallback(_requestFlush)
}

function _requestFlush () {
  while (index < queue.length) {
    const currentIndex = index

    index++
    queue[currentIndex].call()

    // 因为 task 里面可能继续添加队列，可能会产生一个无限长的队列，内存爆炸，
    // 所以如果大于限定的值，需要做处理
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

export default function ascb(task) {
  // 如果 queue 为空，会走 requestFlush，这个函数为一个异步任务
  // 而此方法为同步代码，所以等遍历 queue 的时候，队列里面是已经存在 task 了的
  if (!queue.length) {
    requestFlush()
    flushing = true
  }

  queue[queue.length] = task
}