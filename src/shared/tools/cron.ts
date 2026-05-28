import type { AgentToolMetadata } from './types';

function tool<TName extends string>(metadata: AgentToolMetadata & { name: TName }) {
	return metadata;
}

export const AGENT_TOOL_CRON_TOOLS = [
	tool({
		name: 'cron_create',
		group: 'cron',
		title: 'Create cron schedule',
		description: 'Create a new cron schedule.',
	}),
	tool({
		name: 'cron_read',
		group: 'cron',
		title: 'Read cron schedule',
		description: 'Read a cron schedule by identifier.',
	}),
	tool({
		name: 'cron_update',
		group: 'cron',
		title: 'Update cron schedule',
		description: 'Update an existing cron schedule.',
	}),
	tool({
		name: 'cron_delete',
		group: 'cron',
		title: 'Delete cron schedule',
		description: 'Delete a cron schedule.',
	}),
	tool({
		name: 'cron_list',
		group: 'cron',
		title: 'List cron schedules',
		description: 'List existing cron schedules.',
	}),
	tool({
		name: 'cron_start',
		group: 'cron',
		title: 'Start cron schedule',
		description: 'Start a paused cron schedule.',
	}),
	tool({
		name: 'cron_stop',
		group: 'cron',
		title: 'Stop cron schedule',
		description: 'Stop a running cron schedule.',
	}),
	tool({
		name: 'cron_run',
		group: 'cron',
		title: 'Run cron schedule now',
		description: 'Run a cron schedule immediately.',
	}),
] as const;
