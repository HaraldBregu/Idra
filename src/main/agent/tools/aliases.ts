const TOOL_ALIASES: Readonly<Record<string, string>> = {
	recorder_camera: 'camera_recorder',
	recorder_camera_status: 'camera_recorder_status',
	recorder_camera_stop: 'camera_recorder_stop',
	recorder_microphone: 'microphone_recorder',
	recorder_microphone_status: 'microphone_recorder_status',
	recorder_microphone_stop: 'microphone_recorder_stop',
	recorder_screen: 'screen_recorder',
	recorder_screen_status: 'screen_recorder_status',
	recorder_screen_stop: 'screen_recorder_stop',
};

export function currentToolName(name: string): string {
	return TOOL_ALIASES[name] ?? name;
}
