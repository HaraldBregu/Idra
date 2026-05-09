export { Assistant, type AssistantOptions } from './assistant';
export { AssistantRegistry } from './registry';
export { MemoryManager, buildSystemPrompt } from './memory';
export { SessionManager } from './session';
export { runAgent, type RunAgentParams, type RunResult } from './loop';
export { Tool, type ToolSchema, defaultTools } from './tools';

export const DEFAULT_ASSISTANT_ID = 'main';
