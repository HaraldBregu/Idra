import { app, nativeTheme, shell } from 'electron';
import type { AgentTool } from './types';
import { textResult } from './types';

type ThemeMode = 'light' | 'dark' | 'system';

interface SetThemeArgs {
	mode: ThemeMode;
}

export const setThemeModeTool: AgentTool<SetThemeArgs> = {
	name: 'set_theme_mode',
	description: 'Set the application theme mode. Accepts "light", "dark", or "system".',
	schema: {
		type: 'object',
		properties: { mode: { type: 'string', enum: ['light', 'dark', 'system'] } },
		required: ['mode'],
		additionalProperties: false,
	},
	async execute(args, ctx) {
		const mode = String(args.mode ?? '').toLowerCase() as ThemeMode;
		if (mode !== 'light' && mode !== 'dark' && mode !== 'system') {
			return textResult('mode must be "light", "dark", or "system"', true);
		}
		nativeTheme.themeSource = mode;
		ctx.services.eventBus.emit('theme:changed', { theme: mode });
		return textResult(`Theme mode set to ${mode}.`);
	},
};

export const openAppDataFolderTool: AgentTool = {
	name: 'open_app_data_folder',
	description: "Open the application's userData folder in the OS file manager.",
	schema: { type: 'object', properties: {}, additionalProperties: false },
	async execute(_args, ctx) {
		const target = app.getPath('userData');
		const err = await shell.openPath(target);
		if (err) {
			ctx.services.logger.warn('open_app_data_folder', `openPath failed: ${err}`);
			return textResult(err, true);
		}
		return textResult(`Opened ${target}`);
	},
};

export const openAccessibilityTool: AgentTool = {
	name: 'open_accessibility_settings',
	description: 'Open OS Accessibility privacy settings (macOS only).',
	schema: { type: 'object', properties: {}, additionalProperties: false },
	async execute() {
		if (process.platform !== 'darwin') {
			return textResult('macOS only', true);
		}
		await shell.openExternal(
			'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'
		);
		return textResult('Opened Accessibility settings.');
	},
};

export const openScreenRecordingTool: AgentTool = {
	name: 'open_screen_recording_settings',
	description: 'Open OS Screen Recording privacy settings (macOS only).',
	schema: { type: 'object', properties: {}, additionalProperties: false },
	async execute() {
		if (process.platform !== 'darwin') {
			return textResult('macOS only', true);
		}
		await shell.openExternal(
			'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture'
		);
		return textResult('Opened Screen Recording settings.');
	},
};

interface SetMenuBarArgs {
	enabled: boolean;
}

export const setMenuBarTool: AgentTool<SetMenuBarArgs> = {
	name: 'set_menu_bar',
	description: 'Show or hide the menu bar (system tray) icon.',
	schema: {
		type: 'object',
		properties: { enabled: { type: 'boolean' } },
		required: ['enabled'],
		additionalProperties: false,
	},
	async execute(args, ctx) {
		const enabled = !!args.enabled;
		ctx.services.eventBus.emit('tray:set-enabled', { enabled });
		return textResult(`Menu bar ${enabled ? 'shown' : 'hidden'}.`);
	},
};
