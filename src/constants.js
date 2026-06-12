/**
 * ============================================================================
 * constants.js — 全局常量
 * ============================================================================
 *
 * 真实 React 在 shared 包里有大量内部常量（EffectTag、WorkTag、Lane 等）。
 * 这里只保留教学所需的最小集合，便于对照 React 源码里的同名概念。
 */

/** Fiber 副作用标记：提交阶段据此决定 DOM 操作 */
export const Placement = 1; // 新增节点
export const Update = 2; // 更新已有节点
export const Deletion = 4; // 删除节点

/** 调度优先级（数值越小越优先，类似 React Lane 的简化版） */
export const ImmediatePriority = 1; // 用户输入、同步更新
export const NormalPriority = 2; // 普通 setState
export const LowPriority = 3; // 低优先级后台任务

/** 每帧时间片预算（毫秒），超时则让出主线程 —— 对应 React 的 shouldYield */
export const FRAME_BUDGET = 5;

/** 根 Fiber 标记 */
export const FunctionComponent = 'function_component';
export const HostComponent = 'host_component';
export const HostText = 'host_text';
