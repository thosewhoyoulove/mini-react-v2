import { Window } from 'happy-dom';
import { createElement, render, useEffect, useState } from '../src/react.js';

const window = new Window({ url: 'http://localhost:3000' });
globalThis.window = window;
globalThis.document = window.document;
globalThis.performance = window.performance;
globalThis.queueMicrotask = queueMicrotask;
globalThis.requestIdleCallback = (cb) => {
  setTimeout(() => cb({ timeRemaining: () => 50 }), 0);
};

document.body.innerHTML = '<div id="root"></div>';

function Counter() {
  const [count, setCount] = useState(0);
  useEffect(() => {}, [count]);
  return createElement(
    'div',
    { className: 'counter' },
    createElement('h1', null, 'Mini React 计数器'),
    createElement('p', null, '当前计数: ', createElement('strong', null, String(count))),
    createElement('button', { onClick: () => setCount((c) => c + 1) }, '+1'),
    createElement('button', { onClick: () => setCount(0), style: 'margin-left:8px' }, '重置')
  );
}

render(createElement(Counter), document.getElementById('root'));

async function flush() {
  for (let i = 0; i < 30; i++) await new Promise((r) => setTimeout(r, 5));
}

await flush();

const root = document.getElementById('root');
const btn = root.querySelector('button');
btn.click();
await flush();

console.log('after click strong:', root.querySelector('strong')?.textContent);
console.log('buttons:', root.querySelectorAll('button').length);

if (root.querySelector('strong')?.textContent !== '1') {
  console.error('FAIL: count should be 1');
  process.exit(1);
}
console.log('OK');
