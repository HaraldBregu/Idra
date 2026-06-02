import type { ToolContext } from './base/tool';

export const scratchByContext = new WeakMap<ToolContext, string>();
