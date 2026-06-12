/**
 * 示例：Counter 组件 — useState + useEffect
 */
import { createElement, render, useEffect, useState } from './react.js';

function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log('[useEffect] count 变为:', count);
    return () => console.log('[useEffect cleanup] 上次 count:', count);
  }, [count]);

  return createElement(
    'div',
    { className: 'counter' },
    createElement('h1', null, 'Mini React 计数器'),
    createElement('p', null, '当前计数: ', createElement('strong', null, String(count))),
    createElement(
      'button',
      { onClick: () => setCount((c) => c + 1) },
      '+1'
    ),
    createElement(
      'button',
      { onClick: () => setCount(0), style: 'margin-left:8px' },
      '重置'
    )
  );
}

const root = document.getElementById('root');
render(createElement(Counter), root);

console.log('%c点击按钮观察：Render → Commit → useEffect 日志', 'color:#61dafb;font-weight:bold');
