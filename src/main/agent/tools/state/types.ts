import type { PlanEntry } from '../core/types';

export type TodoStatus = PlanEntry['status'];
export type TodoInput = string | { task?: string; status?: TodoStatus };
