/**
 * ============================================================================
 * fiber.js — Fiber 节点
 * ============================================================================
 *
 * Fiber 是 React 16+ 的核心数据结构：把组件树变成「可中断的链表」。
 *
 * 为什么不用递归遍历整棵树？
 *   递归一旦开始就必须跑完，无法 time slicing。Fiber 用 child / sibling / return
 *   三根指针把树摊平成链表，调度器可以在任意节点暂停，下次从 workInProgress 继续。
 *
 * 与真实 React 的对应关系：
 *   - alternate  ↔  current ↔ workInProgress 双缓冲
 *   - child/sibling/return  ↔  同名指针
 *   - memoizedState  ↔  hooks 链表头（useState/useEffect 数据挂在这里）
 *   - flags  ↔  effectTag（Placement/Update/Deletion）
 */

import { HostText } from './constants.js';

let nextFiberId = 0;

export function createFiber(type, props) {
  return {
    id: nextFiberId++,
    type,
    props: props || {},
    child: null,
    sibling: null,
    return: null,
    alternate: null,
    dom: null,
    memoizedState: null,
    flags: 0,
    hookIndex: 0,
    updateQueue: null,
  };
}

export function resetHookIndex(fiber) {
  fiber.hookIndex = 0;
}

export function isFunctionComponent(fiber) {
  return typeof fiber.type === 'function';
}

export function isHostText(fiber) {
  return fiber.type === HostText;
}
