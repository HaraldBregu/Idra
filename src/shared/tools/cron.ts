import { defineAgentTools } from './types';

export const AGENT_TOOL_CRON_TOOLS = defineAgentTools([
	{
		name: 'cron_create',
		title: 'Create cron schedule',
		description: 'Create a new cron schedule.',
	},
	{
		name: 'cron_read',
		title: 'Read cron schedule',
		description: 'Read a cron schedule by identifier.',
	},
	{
		name: 'cron_update',
		title: 'Update cron schedule',
		description: 'Update an existing cron schedule.',
	},
	{
		name: 'cron_delete',
		title: 'Delete cron schedule',
		description: 'Delete a cron schedule.',
	},
	{
		name: 'cron_list',
		title: 'List cron schedules',
		description: 'List existing cron schedules.',
	},
	{
		name: 'cron_start',
		title: 'Start cron schedule',
		description: 'Start a paused cron schedule.',
	},
	{
		name: 'cron_stop',
		title: 'Stop cron schedule',
		description: 'Stop a running cron schedule.',
	},
	{
		name: 'cron_run',
		title: 'Run cron schedule now',
		description: 'Run a cron schedule immediately.',
	},
]);
