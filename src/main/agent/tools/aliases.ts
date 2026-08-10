const TOOL_ALIASES: Readonly<Record<string, string>> = {
	create_schedule: 'create_task',
	delete_schedule: 'delete_task',
	edit: 'edit_file',
	exec: 'exec_command',
	get_schedule: 'get_task',
	health_check_settings_update: 'update_health_cheeck_settings',
	health_check_update: 'update_health_cheeck',
	health_settings_update: 'update_health_cheeck_settings',
	health_update: 'update_health_cheeck',
	list_schedules: 'list_tasks',
	pause_schedule: 'pause_task',
	recorder_camera: 'camera_recorder',
	recorder_camera_status: 'camera_recorder_status',
	recorder_camera_stop: 'camera_recorder_stop',
	recorder_microphone: 'microphone_recorder',
	recorder_microphone_status: 'microphone_recorder_status',
	recorder_microphone_stop: 'microphone_recorder_stop',
	recorder_screen: 'screen_recorder',
	recorder_screen_status: 'screen_recorder_status',
	recorder_screen_stop: 'screen_recorder_stop',
	read: 'read_file',
	resume_schedule: 'resume_task',
	run_schedule_now: 'run_task_now',
	update_schedule: 'update_task',
	write: 'write_file',
};

export function currentToolName(name: string): string {
	return TOOL_ALIASES[name] ?? name;
}
