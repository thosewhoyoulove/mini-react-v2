/**
 * ============================================================================
 * react.js — 对外 API：createElement & render
 * ============================================================================
 *
 * JSX 编译后变成 createElement(type, props, ...children)
 * 这里手写 createElement 供示例直接使用。
 */

import { renderRoot } from './reconciler.js';
export { useEffect, useState } from './hooks.js';

/**
 * 创建虚拟 DOM 元素描述对象（React Element）
 * 注意：这是普通对象，不是 Fiber；Fiber 在 reconcile 阶段才创建
 */
export function createElement(type, props, ...children) {
  const flatChildren = children.flat(Infinity);
  return {
    type,
    props: {
      ...props,
      children: flatChildren.map((child) =>
        typeof child === 'object' ? child : createTextElement(child)
      ),
    },
    key: props?.key ?? null,
  };
}

function createTextElement(text) {
  return {
    type: 'TEXT_ELEMENT',
    props: { nodeValue: text, children: [] },
    key: null,
  };
}

/** 兼容 TEXT_ELEMENT 常量（reconciler 里用 HostText） */
export const TEXT_ELEMENT = 'TEXT_ELEMENT';

/**
 * ReactDOM.render 简化版
 * @param {object} element - createElement 返回值
 * @param {HTMLElement} container
 */
export function render(element, container) {
  if (element?.type === 'TEXT_ELEMENT') {
    element.type = TEXT_ELEMENT;
  }
  renderRoot(element, container);
}

/** Fragment 简化：仅返回 children 数组 */
export function Fragment({ children }) {
  return children;
}
