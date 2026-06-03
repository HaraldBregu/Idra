import type { ToolContext } from '../../core/tool';

export const scratchByContext = new WeakMap<ToolContext, string>();
