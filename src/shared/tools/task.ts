import type { AgentToolMetadata } from './types';
import {
	AGENT_TOOL_APPROVAL_NONE,
	AGENT_TOOL_STANDARD_PROFILES,
} from './types';

const DEFAULT_TOOL_PROFILES = AGENT_TOOL_STANDARD_PROFILES;

function tool<TName extends string>(metadata: AgentToolMetadata & { name: TName }) {
	return metadata;
}

export const AGENT_TOOL_TASK_TOOLS = [
	tool({
		name: 'todo_create',
		group: 'stateTask',
		title: 'Create todo',
		description: 'Create a local todo entry for the current run.',
		permissions: ['state'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'optional',
	}),
	tool({
		name: 'todo_update',
		group: 'stateTask',
		title: 'Update todo',
		description: 'Update a local todo entry for the current run.',
		permissions: ['state'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'optional',
	}),
	tool({
		name: 'todo_complete',
		group: 'stateTask',
		title: 'Complete todo',
		description: 'Mark a local todo as completed.',
		permissions: ['state'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'optional',
	}),
] as const;
