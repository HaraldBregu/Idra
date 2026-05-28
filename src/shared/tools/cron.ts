import type { AgentToolMetadata } from './types';
import {
	AGENT_TOOL_APPROVAL_ALWAYS,
	AGENT_TOOL_STANDARD_PROFILES,
} from './types';

const DEFAULT_TOOL_PROFILES = AGENT_TOOL_STANDARD_PROFILES;

function tool<TName extends string>(metadata: AgentToolMetadata & { name: TName }) {
	return metadata;
}

export const AGENT_TOOL_CRON_TOOLS = [
	tool({
		name: 'cron_create',
		group: 'cron',
		title: 'Create cron schedule',
		description: 'Create a new cron schedule.',
		permissions: ['cron:createSchedule'],
		approval: AGENT_TOOL_APPROVAL_ALWAYS,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'optional',
	}),
	tool({
		name: 'cron_read',
		group: 'cron',
		title: 'Read cron schedule',
		description: 'Read a cron schedule by identifier.',
		permissions: ['cron:listSchedules'],
		approval: AGENT_TOOL_APPROVAL_ALWAYS,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'optional',
	}),
	tool({
		name: 'cron_update',
		group: 'cron',
		title: 'Update cron schedule',
		description: 'Update an existing cron schedule.',
		permissions: ['cron:updateSchedule'],
		approval: AGENT_TOOL_APPROVAL_ALWAYS,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'optional',
	}),
	tool({
		name: 'cron_delete',
		group: 'cron',
		title: 'Delete cron schedule',
		description: 'Delete a cron schedule.',
		permissions: ['cron:deleteSchedule'],
		approval: AGENT_TOOL_APPROVAL_ALWAYS,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'optional',
	}),
	tool({
		name: 'cron_list',
		group: 'cron',
		title: 'List cron schedules',
		description: 'List existing cron schedules.',
		permissions: ['cron:listSchedules'],
		approval: AGENT_TOOL_APPROVAL_ALWAYS,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'optional',
	}),
	tool({
		name: 'cron_start',
		group: 'cron',
		title: 'Start cron schedule',
		description: 'Start a paused cron schedule.',
		permissions: ['cron:resumeSchedule'],
		approval: AGENT_TOOL_APPROVAL_ALWAYS,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'optional',
	}),
	tool({
		name: 'cron_stop',
		group: 'cron',
		title: 'Stop cron schedule',
		description: 'Stop a running cron schedule.',
		permissions: ['cron:pauseSchedule'],
		approval: AGENT_TOOL_APPROVAL_ALWAYS,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'optional',
	}),
	tool({
		name: 'cron_run',
		group: 'cron',
		title: 'Run cron schedule now',
		description: 'Run a cron schedule immediately.',
		permissions: ['cron:runScheduleNow'],
		approval: AGENT_TOOL_APPROVAL_ALWAYS,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'optional',
	}),
] as const;
