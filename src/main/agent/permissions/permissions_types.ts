export type PermissionMode = 'allow' | 'deny' | 'ask';

export interface ToolPermission {
	mode: PermissionMode;
}

export interface PermissionsSchema {
	defaultMode: PermissionMode;
	tools: Record<string, ToolPermission>;
}

export const DEFAULT_PERMISSIONS: PermissionsSchema = {
	defaultMode: 'ask',
	tools: {
		read: { mode: 'allow' },
		list_schedules: { mode: 'allow' },
		get_schedule: { mode: 'allow' },
		load_skill: { mode: 'allow' },
		write: { mode: 'ask' },
		edit: { mode: 'ask' },
		exec: { mode: 'ask' },
		process: { mode: 'ask' },
		create_schedule: { mode: 'ask' },
		update_schedule: { mode: 'ask' },
		delete_schedule: { mode: 'ask' },
		pause_schedule: { mode: 'ask' },
		resume_schedule: { mode: 'ask' },
		run_schedule_now: { mode: 'ask' },
	},
};
