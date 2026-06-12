/**
 * ============================================================================
 * scheduler.js — 调度器 / Time Slicing
 * ============================================================================
 *
 * 真实 React 使用 Scheduler 包（MessageChannel + 优先级 Lane）。
 * 这里用「优先级队列 + requestIdleCallback/setTimeout + 帧预算」演示同样思想：
 *
 *   1. 多个更新入队，按 priority 排序
 *   2. workLoop 每处理一个 Fiber 检查是否超时
 *   3. 超时则 yield，把控制权还给浏览器，下次继续
 *
 * 这样长列表渲染不会卡死 UI —— 正是 Fiber + Scheduler 要解决的问题。
 */

import { FRAME_BUDGET, ImmediatePriority, NormalPriority } from './constants.js';

/** @type {Array<{ priority: number, callback: Function }>} */
const taskQueue = [];
let isPerformingWork = false;
let currentTask = null;

function sortQueue() {
  taskQueue.sort((a, b) => a.priority - b.priority);
}

/**
 * 调度一个任务
 * @param {Function} callback - 通常为 performConcurrentWorkOnRoot
 * @param {number} priority
 */
export function scheduleCallback(callback, priority = NormalPriority) {
  taskQueue.push({ priority, callback });
  sortQueue();

  if (!isPerformingWork) {
    requestHostCallback(flushWork);
  }
}

function requestHostCallback(cb) {
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback((deadline) => cb(deadline));
  } else {
    setTimeout(() => cb({ timeRemaining: () => FRAME_BUDGET }), 0);
  }
}

function flushWork(deadline) {
  isPerformingWork = true;

  while (taskQueue.length > 0 && !shouldYield(deadline)) {
    currentTask = taskQueue.shift();
    const continuation = currentTask.callback();
    if (typeof continuation === 'function') {
      currentTask.callback = continuation;
      taskQueue.unshift(currentTask);
      sortQueue();
      break;
    }
    currentTask = null;
  }

  isPerformingWork = false;

  if (taskQueue.length > 0) {
    requestHostCallback(flushWork);
  }
}

/** 是否该让出主线程 —— 对应 React 的 shouldYieldToHost */
function shouldYield(deadline) {
  if (deadline && typeof deadline.timeRemaining === 'function') {
    return deadline.timeRemaining() < 1;
  }
  return false;
}

/** 同步立即执行（首次 mount 或紧急优先级） */
export function runWithPriority(priority, fn) {
  if (priority === ImmediatePriority) {
    return fn();
  }
  scheduleCallback(fn, priority);
}

export function getCurrentPriority() {
  return currentTask?.priority ?? NormalPriority;
}
