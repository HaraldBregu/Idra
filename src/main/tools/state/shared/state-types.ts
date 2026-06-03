import type { PlanEntry } from '../../core/tool';

export type TodoStatus = PlanEntry['status'];
export type TodoInput = string | { task?: string; status?: TodoStatus };
