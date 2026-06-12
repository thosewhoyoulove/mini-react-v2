/**
 * hooks.js — useState & useEffect
 */

import { scheduleUpdateOnFiber } from './reconciler.js';

let currentlyRenderingFiber = null;
let pendingEffects = null;
let pendingEffectsTail = null;

export function setCurrentlyRenderingFiber(fiber) {
  currentlyRenderingFiber = fiber;
}

export function clearCurrentlyRenderingFiber() {
  currentlyRenderingFiber = null;
}

function getAlternateHook(fiber, index) {
  if (!fiber.alternate?.memoizedState) return null;
  let hook = fiber.alternate.memoizedState;
  for (let i = 0; i < index; i++) hook = hook.next;
  return hook;
}

/** 按 hookIndex 取/建当前 render 的 Hook 节点 */
function getHook() {
  const fiber = currentlyRenderingFiber;
  const index = fiber.hookIndex;
  const oldHook = getAlternateHook(fiber, index);

  const hook = {
    memoizedState: oldHook ? oldHook.memoizedState : null,
    queue: oldHook ? oldHook.queue : [],
    next: null,
    deps: null,
    destroy: oldHook?.destroy ?? null,
  };

  if (index === 0) {
    fiber.memoizedState = hook;
  } else {
    let prev = fiber.memoizedState;
    while (prev.next) prev = prev.next;
    prev.next = hook;
  }

  fiber.hookIndex++;
  return hook;
}

export function useState(initial) {
  const hook = getHook();
  const oldHook = getAlternateHook(
    currentlyRenderingFiber,
    currentlyRenderingFiber.hookIndex - 1
  );

  if (hook.queue.length > 0) {
    hook.queue.forEach((action) => {
      hook.memoizedState =
        typeof action === 'function' ? action(hook.memoizedState) : action;
    });
    hook.queue = [];
  } else if (!oldHook) {
    hook.memoizedState = typeof initial === 'function' ? initial() : initial;
  }

  const fiber = currentlyRenderingFiber;
  const setState = (action) => {
    hook.queue.push(action);
    scheduleUpdateOnFiber(fiber);
  };

  return [hook.memoizedState, setState];
}

export function useEffect(effect, deps) {
  const hook = getHook();
  const oldHook = getAlternateHook(
    currentlyRenderingFiber,
    currentlyRenderingFiber.hookIndex - 1
  );

  const hasChanged =
    !oldHook ||
    !deps ||
    !oldHook.deps ||
    deps.some((dep, i) => dep !== oldHook.deps[i]);

  hook.deps = deps;

  if (hasChanged) {
    if (oldHook?.destroy) {
      queueMicrotask(() => oldHook.destroy());
    }
    hook.destroy = null;

    const record = {
      next: null,
      run: () => {
        const destroy = effect();
        if (typeof destroy === 'function') hook.destroy = destroy;
      },
    };

    if (!pendingEffects) {
      pendingEffects = record;
      pendingEffectsTail = record;
    } else {
      pendingEffectsTail.next = record;
      pendingEffectsTail = record;
    }
  }
}

export function flushEffects() {
  const list = pendingEffects;
  pendingEffects = null;
  pendingEffectsTail = null;

  let cursor = list;
  while (cursor) {
    cursor.run();
    cursor = cursor.next;
  }
}

export function flushPassiveUnmountEffects(fiber) {
  let hook = fiber?.memoizedState;
  while (hook) {
    if (hook.destroy) hook.destroy();
    hook = hook.next;
  }
}
