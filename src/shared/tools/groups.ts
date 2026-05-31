export const AGENT_TOOL_GROUP_METADATA = {
	coreWorkspace: {
		title: 'Core workspace tools',
		description: 'Read, write, search, inspect, and run commands inside a workspace.',
	},
	stateTask: {
		title: 'State / task tools',
		description: 'Track run-local todos, task completion, and scratch notes.',
	},
	humanDecision: {
		title: 'Human decision tools',
		description: 'Request human input, approval, authorization, or plan review.',
	},
	subagent: {
		title: 'Subagent tools',
		description: 'Delegate scoped work to a child agent.',
	},
	skill: {
		title: 'Skill tools',
		description: 'Discover, load, and apply installed agent skills.',
	},
	mcpConnector: {
		title: 'MCP connector tools',
		description: 'Discover and call Model Context Protocol servers, tools, resources, and prompts.',
	},
	script: {
		title: 'Script tools',
		description: 'Run existing workspace scripts with explicit interpreter and output limits.',
	},
	cron: {
		title: 'Cron tools',
		description: 'Create, read, update, delete, pause, resume, and run scheduled jobs.',
	},
	web: {
		title: 'Web tools',
		description: 'Fetch web content and open URLs in the default browser.',
	},
} as const;

export type AgentToolGroupName = keyof typeof AGENT_TOOL_GROUP_METADATA;
