/**
 * ============================================================================
 * renderer.js — 宿主环境 DOM 操作
 * ============================================================================
 *
 * Reconciler 是平台无关的；Renderer（react-dom）负责把 Fiber 映射到 DOM。
 * 这里只做最小实现：createElement、updateProps、文本/元素区分。
 *
 * Diff 优化点（updateDom）：
 *   - 同 type 的 Host 节点复用 dom，只 diff props
 *   - 删除旧 prop、更新变化 prop，避免整节点替换
 */

import { HostText } from './constants.js';

export function createDom(fiber) {
  if (fiber.type === HostText) {
    return document.createTextNode('');
  }
  const dom = document.createElement(fiber.type);
  updateDom(dom, {}, fiber.props);
  return dom;
}

/**
 * 属性 Diff：仅更新变化的 key，减少 DOM 写入
 */
export function updateDom(dom, prevProps, nextProps) {
  const isEvent = (key) => key.startsWith('on');
  const isProp = (key) => key !== 'children' && !isEvent(key);

  for (const key in prevProps) {
    if (key === 'children') continue;
    if (!(key in nextProps)) {
      if (isEvent(key)) {
        dom.removeEventListener(key.slice(2).toLowerCase(), prevProps[key]);
      } else if (isProp(key)) {
        dom[key] = '';
      }
    }
  }

  for (const key in nextProps) {
    if (key === 'children') continue;
    if (prevProps[key] === nextProps[key]) continue;

    if (isEvent(key)) {
      const event = key.slice(2).toLowerCase();
      if (prevProps[key]) dom.removeEventListener(event, prevProps[key]);
      dom.addEventListener(event, nextProps[key]);
    } else if (key === 'className') {
      dom.className = nextProps[key];
    } else if (key === 'style' && typeof nextProps[key] === 'string') {
      dom.style.cssText = nextProps[key];
    } else if (isProp(key)) {
      dom[key] = nextProps[key];
    }
  }
}

export function appendChild(parent, child) {
  parent.appendChild(child);
}

export function removeChild(parent, child) {
  if (parent && child && child.parentNode === parent) {
    parent.removeChild(child);
  }
}

export function setTextContent(dom, text) {
  dom.nodeValue = text;
}

/** 从 Fiber 子树中找到第一个 Host DOM（用于 insertBefore 定位） */
export function getFirstDom(fiber) {
  if (!fiber) return null;
  if (fiber.dom) return fiber.dom;
  if (fiber.child) return getFirstDom(fiber.child);
  return null;
}
