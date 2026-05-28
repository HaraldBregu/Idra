import { defineAgentTools } from './types';

export const AGENT_TOOL_CRON_TOOLS = defineAgentTools([
	{
		name: 'cron_create',
		label: 'Create cron schedule',
		description: 'Create a new cron schedule.',
	},
	{
		name: 'cron_read',
		label: 'Read cron schedule',
		description: 'Read a cron schedule by identifier.',
	},
	{
		name: 'cron_update',
		label: 'Update cron schedule',
		description: 'Update an existing cron schedule.',
	},
	{
		name: 'cron_delete',
		label: 'Delete cron schedule',
		description: 'Delete a cron schedule.',
	},
	{
		name: 'cron_list',
		label: 'List cron schedules',
		description: 'List existing cron schedules.',
	},
	{
		name: 'cron_start',
		label: 'Start cron schedule',
		description: 'Start a paused cron schedule.',
	},
	{
		name: 'cron_stop',
		label: 'Stop cron schedule',
		description: 'Stop a running cron schedule.',
	},
	{
		name: 'cron_run',
		label: 'Run cron schedule now',
		description: 'Run a cron schedule immediately.',
	},
]);
