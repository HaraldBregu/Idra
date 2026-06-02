import type { PlanEntry } from './base/tool';

export type TodoStatus = PlanEntry['status'];
export type TodoInput = string | { task?: string; status?: TodoStatus };
