export { SubagentRegistry } from './registry';
export { SubagentSpawnService, type SubagentSpawnPort } from './service';
export { createSubagentsControlTool } from './control';
export { createSessionsSpawnTool } from './tool';
export type {
	SessionsSpawnInput,
	SessionsSpawnResult,
	SubagentsControlInput,
	SubagentsControlResult,
	SubagentRunRecord,
	SubagentRunTaskInput,
	SubagentRunTaskResult,
} from './types';
