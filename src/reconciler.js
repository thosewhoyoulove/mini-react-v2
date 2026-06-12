/**
 * ============================================================================
 * reconciler.js — 协调器：Render 阶段 + Commit 阶段
 * ============================================================================
 *
 * 一次完整更新分两阶段（与 React 一致）：
 *
 * 【Render 阶段 — 可中断】
 *   workLoop → performUnitOfWork → beginWork / completeWork
 *   构建 workInProgress 树，打 flags，不碰真实 DOM
 *
 * 【Commit 阶段 — 不可中断】
 *   commitRoot → commitWork → flushEffects
 *   一次性应用 DOM 变更，再跑 useEffect
 *
 * Fiber 遍历顺序（深度优先）：
 *   有 child → 进 child
 *   无 child 有 sibling → 进 sibling
 *   都没有 → completeWork，再沿 return 找 sibling
 */

import {
  Deletion,
  HostText,
  NormalPriority,
  Placement,
  Update,
} from './constants.js';
import {
  createFiber,
  isFunctionComponent,
  isHostText,
  resetHookIndex,
} from './fiber.js';
import {
  clearCurrentlyRenderingFiber,
  flushEffects,
  flushPassiveUnmountEffects,
  setCurrentlyRenderingFiber,
} from './hooks.js';
import {
  appendChild,
  createDom,
  setTextContent,
  updateDom,
} from './renderer.js';
import { scheduleCallback } from './scheduler.js';

/** 根容器 ↔ Fiber 映射 */
const containerMap = new WeakMap();

/** 全局 work 指针 */
let wipRoot = null;
let currentRoot = null;
let deletions = [];
let nextUnitOfWork = null;

/**
 * 从某个 Fiber 向上 schedule 更新（setState 入口）
 */
export function scheduleUpdateOnFiber(fiber) {
  let node = fiber;
  while (node.return) node = node.return;

  wipRoot = {
    dom: node.dom,
    props: node.props,
    type: node.type,
    alternate: currentRoot,
    child: null,
    sibling: null,
    return: null,
  };

  deletions = [];
  nextUnitOfWork = wipRoot;
  workStartTime = 0;

  scheduleCallback(workLoop, NormalPriority);
}

/**
 * 首次渲染入口（由 ReactDOM.render 调用）
 */
export function renderRoot(element, container) {
  wipRoot = createFiber('root', { children: [element] });
  wipRoot.dom = container;
  wipRoot.alternate = currentRoot;
  containerMap.set(container, wipRoot);

  deletions = [];
  nextUnitOfWork = wipRoot;
  workStartTime = 0;

  scheduleCallback(workLoop, NormalPriority);
}

/** 时间片工作循环：返回 continuation 表示未完成 */
function workLoop() {
  // 每个时间片重新开始计时，否则 yield 后会永远 shouldYield → 无法 commit
  workStartTime = performance.now();

  while (nextUnitOfWork && !shouldYield()) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
  }

  if (!nextUnitOfWork && wipRoot) {
    commitRoot();
    return undefined;
  }

  if (nextUnitOfWork) {
    return workLoop;
  }
}

let workStartTime = 0;
function shouldYield() {
  return performance.now() - workStartTime > 5;
}

function performUnitOfWork(fiber) {
  beginWork(fiber);
  if (fiber.child) return fiber.child;

  let node = fiber;
  while (node) {
    completeWork(node);
    if (node.sibling) return node.sibling;
    node = node.return;
  }
  return null;
}

function beginWork(fiber) {
  if (isFunctionComponent(fiber)) {
    resetHookIndex(fiber);
    setCurrentlyRenderingFiber(fiber);
    const childElements = fiber.type(fiber.props);
    clearCurrentlyRenderingFiber();
    reconcileChildren(
      fiber,
      Array.isArray(childElements) ? childElements : [childElements]
    );
  } else {
    const elements = fiber.props?.children ?? [];
    reconcileChildren(fiber, Array.isArray(elements) ? elements : [elements]);
  }
}

/**
 * ============================================================
 * Diff / Reconciliation — 子节点协调
 * ============================================================
 *
 * 策略（简化版 React 单节点 diff）：
 *   1. type 相同 → 复用 Fiber（alternate），打 Update，递归 props
 *   2. type 不同 → 删旧建新，打 Deletion + Placement
 *   3. 有 key 时按 key 匹配（本示例 Counter 无 list，但实现保留）
 *
 * 性能要点：复用 alternate 可保留 state（hooks 在函数 Fiber 上）
 */
function getElementFiberType(element) {
  if (element == null || typeof element === 'boolean') return null;
  if (typeof element === 'string' || typeof element === 'number') return HostText;
  if (element.type === 'TEXT_ELEMENT') return HostText;
  return element.type;
}

function reconcileChildren(wipFiber, elements) {
  const oldFiber = wipFiber.alternate?.child;
  let index = 0;
  let prevSibling = null;
  let oldChild = oldFiber;

  while (index < elements.length || oldChild) {
    const element = index < elements.length ? elements[index] : null;
    let newFiber = null;

    const elementType = getElementFiberType(element);
    const sameType =
      element &&
      oldChild &&
      elementType === oldChild.type &&
      (element.key == null || element.key === oldChild.key);

    if (sameType) {
      newFiber = {
        ...oldChild,
        props: element.props,
        alternate: oldChild,
        flags: Update,
        child: null,
        sibling: null,
      };
      oldChild = oldChild.sibling;
    } else {
      if (oldChild) {
        deletions.push(oldChild);
        oldChild = oldChild.sibling;
      }
      if (element) {
        newFiber = createFiberFromElement(element);
        newFiber.flags = Placement;
      }
    }

    if (element) index++;

    if (newFiber) {
      newFiber.return = wipFiber;
      if (!prevSibling) {
        wipFiber.child = newFiber;
      } else {
        prevSibling.sibling = newFiber;
      }
      prevSibling = newFiber;
    }
  }
}

function createFiberFromElement(element) {
  if (element == null || typeof element === 'boolean') {
    return null;
  }
  if (typeof element === 'string' || typeof element === 'number') {
    return createFiber(HostText, { nodeValue: element, children: [] });
  }
  const type =
    element.type === 'TEXT_ELEMENT' ? HostText : element.type;
  const props =
    type === HostText
      ? { nodeValue: element.props.nodeValue, children: [] }
      : { ...element.props, children: element.props.children ?? [] };
  return createFiber(type, props);
}

function completeWork(fiber) {
  if (isFunctionComponent(fiber) || fiber.type === 'root') return;

  if (!fiber.dom) {
    if (isHostText(fiber)) {
      fiber.dom = document.createTextNode('');
      setTextContent(fiber.dom, fiber.props.nodeValue ?? '');
    } else {
      fiber.dom = createDom(fiber);
    }
  } else if (fiber.flags & Update) {
    if (isHostText(fiber)) {
      setTextContent(fiber.dom, fiber.props.nodeValue ?? '');
    } else {
      updateDom(fiber.dom, fiber.alternate.props, fiber.props);
    }
  }
}

/** 向上查找宿主 DOM 父节点（跳过无 dom 的函数组件） */
function getDomParent(fiber) {
  let parent = fiber.return;
  while (parent) {
    if (parent.type === 'root') return parent.dom;
    if (parent.dom && !isFunctionComponent(parent)) return parent.dom;
    parent = parent.return;
  }
  return null;
}

function commitRoot() {
  deletions.forEach(commitDeletion);
  commitWork(wipRoot.child);
  flushEffects();

  currentRoot = wipRoot;
  wipRoot = null;
  deletions = [];
  workStartTime = 0;
}

function commitDeletion(fiber) {
  flushPassiveUnmountEffects(fiber);

  // 只移除当前 fiber 的 host DOM；不要递归 sibling（兄弟节点可能仍有效）
  if (fiber.dom && !isFunctionComponent(fiber)) {
    if (fiber.dom.parentNode) {
      fiber.dom.parentNode.removeChild(fiber.dom);
    }
    return;
  }

  // 函数组件无 dom：仅沿 child 链删除各子树（子 sibling 各自独立处理）
  let child = fiber.child;
  while (child) {
    commitDeletion(child);
    child = child.sibling;
  }
}

function commitWork(fiber) {
  if (!fiber) return;

  if (!isFunctionComponent(fiber) && fiber.type !== 'root' && fiber.dom) {
    const domParent = getDomParent(fiber);

    if (fiber.flags & Placement && domParent && fiber.dom.parentNode !== domParent) {
      appendChild(domParent, fiber.dom);
    }

    if (fiber.flags & Update) {
      if (isHostText(fiber)) {
        setTextContent(fiber.dom, fiber.props.nodeValue ?? '');
      } else {
        updateDom(fiber.dom, fiber.alternate?.props ?? {}, fiber.props);
      }
    }
  }

  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

export function getFiberFromContainer(container) {
  return containerMap.get(container);
}
