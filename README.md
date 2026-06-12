# Mini React

从零实现的 **Mini React** 教学项目，用原生 JavaScript（ES Module）演示 React 16+ 的核心机制：

- **Fiber 架构** — 可中断的链表化组件树
- **Hooks** — `useState` / `useEffect`
- **Scheduler** — 优先级队列 + 时间片（Time Slicing）
- **Reconciler** — Render / Commit 两阶段 + Diff
- **Renderer** — DOM 创建与增量更新

> 目标不是替代 React，而是理解 `setState` 之后发生了什么。

---

## 快速开始

### 环境要求

- Node.js 18+

### 安装与运行

```bash
# 克隆后进入项目目录
cd mini-react

# 启动本地开发服务器
npm start
```

浏览器打开：**http://localhost:3000**

> 必须通过 HTTP 访问（不能直接双击 `index.html`），因为示例使用了 ES Module。

### 运行测试

```bash
npm test
```

---

## 示例

`src/example.js` 提供了一个 Counter 组件：

- `useState` 管理计数
- `useEffect` 在 count 变化时打印日志
- 两个按钮：`+1` / `重置`

打开浏览器 **开发者工具 Console**，点击按钮可观察：

```
Render → Commit → useEffect
```

---

## 项目结构

```
mini-react/
├── index.html              # 入口页面
├── package.json
├── scripts/
│   ├── dev-server.mjs      # 本地静态服务器
│   └── test-render.mjs     # 渲染冒烟测试
└── src/
    ├── constants.js        # flags、优先级等常量
    ├── fiber.js            # Fiber 节点定义
    ├── hooks.js            # useState / useEffect
    ├── scheduler.js        # 调度器 / 时间片
    ├── reconciler.js       # 协调器（核心）
    ├── renderer.js         # DOM 操作
    ├── react.js            # createElement / render API
    └── example.js          # Counter 示例
```

---

## 架构概览

```
用户代码 (createElement / useState / useEffect)
        ↓
react.js          — 对外 API
        ↓
reconciler.js     — Fiber 树构建 + Diff + 两阶段提交
        ↓
scheduler.js      — 任务调度 + 时间片
        ↓
renderer.js       — DOM 增删改
        ↓
fiber.js + hooks.js
```

---

## 一次更新的完整流程

以点击 `+1` 为例：

```
1. setState(action)
     → hook.queue 入队
     → scheduleUpdateOnFiber

2. Scheduler 调度 workLoop（可中断）

3. Render 阶段
     → beginWork：执行组件、协调子节点、跑 Hooks
     → completeWork：创建/更新 Fiber.dom、打 flags
     → 不操作真实 DOM

4. Commit 阶段（同步、不可中断）
     → commitDeletion：删除旧 DOM
     → commitWork：插入/更新 DOM
     → flushEffects：执行 useEffect

5. currentRoot = wipRoot（提交完成）
```

---

## Fiber 链表

每个 Fiber 节点通过三根指针摊平组件树：

```
        return (父)
           ↑
  sibling ← ● → child
```

- **child** — 第一个子节点
- **sibling** — 下一个兄弟
- **return** — 父节点
- **alternate** — 双缓冲（current ↔ workInProgress）

---

## Hooks 存储

Hooks 状态挂在 **Fiber.memoizedState 链表**上，用 `hookIndex` 保证调用顺序：

```
Counter Fiber
  memoizedState → Hook0 (useState)
                    ↓ next
                  Hook1 (useEffect)
```

---

## 与真实 React 的对比

| 能力 | Mini React | 真实 React |
|------|------------|------------|
| Fiber 链表 | ✅ | ✅ |
| 双缓冲 | ✅ alternate | ✅ current / workInProgress |
| Render / Commit | ✅ | ✅ |
| useState / useEffect | ✅ | ✅ + 更多 Hooks |
| Time Slicing | ✅ 简化版 | ✅ Scheduler + Lane |
| 批量更新 | ❌ | ✅ React 18 batching |
| Concurrent Mode | ❌ | ✅ |

---

## 建议阅读顺序

1. `src/constants.js` — 认识 flags 与优先级
2. `src/fiber.js` — 理解链表指针
3. `src/hooks.js` — 状态存在 Fiber 上
4. `src/scheduler.js` — 时间片如何让出主线程
5. `src/reconciler.js` — 核心：`workLoop` → `commitRoot`
6. `src/renderer.js` — DOM 增量更新
7. `src/example.js` — 跑起来对照 Console 日志

---

## 技术栈

- 纯 JavaScript（ES6+ Module）
- 无 React / 无构建工具
- Node.js 内置 `http` 模块提供静态服务

---

## License

MIT
