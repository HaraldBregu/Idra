export { SubagentRegistry } from './registry';
export { SubagentSpawnService, type SubagentSpawnPort } from './spawn-service';
export { createSubagentsControlTool } from './control-tool';
export { createSessionsSpawnTool } from './spawn-tool';
export type {
	SessionsSpawnInput,
	SessionsSpawnResult,
	SubagentsControlInput,
	SubagentsControlResult,
	SubagentRunRecord,
	SubagentRunTaskInput,
	SubagentRunTaskResult,
} from './types';
