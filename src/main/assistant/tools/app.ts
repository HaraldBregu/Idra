import { nativeTheme, shell } from 'electron';
import { Tool } from './base';
import type { EventBus } from '../../core/event-bus';
import type { LoggerService } from '../../logger';
import { getDefaultDataDirectory } from '../../utils';

type ThemeMode = 'light' | 'dark' | 'system';

function stringArg(args: Record<string, unknown>, names: string[]): string {
	for (const name of names) {
		const value = args[name];
		if (typeof value === 'string') return value.trim();
	}
	return '';
}

function boolArg(args: Record<string, unknown>, names: string[]): boolean | null {
	for (const name of names) {
		const value = args[name];
		if (typeof value === 'boolean') return value;
		if (typeof value === 'string') {
			const v = value.trim().toLowerCase();
			if (v === 'true' || v === 'yes' || v === 'on' || v === '1') return true;
			if (v === 'false' || v === 'no' || v === 'off' || v === '0') return false;
		}
	}
	return null;
}

export class SetThemeModeTool extends Tool {
	name = 'set_theme_mode';
	description = 'Set the application theme mode. Accepts "light", "dark", or "system".';
	parameters = {
		type: 'object',
		properties: {
			mode: {
				type: 'string',
				enum: ['light', 'dark', 'system'],
				description: 'Theme mode to apply.',
			},
		},
		required: ['mode'],
		additionalProperties: false,
	};

	constructor(private readonly eventBus: EventBus) {
		super();
	}

	async execute(args: Record<string, unknown>): Promise<string> {
		const mode = stringArg(args, ['mode']).toLowerCase();
		if (mode !== 'light' && mode !== 'dark' && mode !== 'system') {
			return 'Error: mode must be "light", "dark", or "system"';
		}
		const themeMode = mode as ThemeMode;
		nativeTheme.themeSource = themeMode;
		this.eventBus.emit('theme:changed', { theme: themeMode });
		return `Theme mode set to ${themeMode}.`;
	}
}

export class OpenAppDataFolderTool extends Tool {
	name = 'open_app_data_folder';
	description = "Open the application's userData folder in the OS file manager.";
	parameters = {
		type: 'object',
		properties: {},
		additionalProperties: false,
	};

	constructor(private readonly logger: LoggerService) {
		super();
	}

	async execute(): Promise<string> {
		const target = getDefaultDataDirectory();
		const err = await shell.openPath(target);
		if (err) {
			this.logger.warn('OpenAppDataFolderTool', `openPath failed: ${err}`);
			return `Error: ${err}`;
		}
		return `Opened ${target}`;
	}
}

export class OpenAccessibilityTool extends Tool {
	name = 'open_accessibility_settings';
	description =
		'Open the OS Accessibility privacy settings (macOS only). On other platforms returns an error.';
	parameters = {
		type: 'object',
		properties: {},
		additionalProperties: false,
	};

	async execute(): Promise<string> {
		if (process.platform !== 'darwin') {
			return 'Error: open_accessibility_settings is only supported on macOS';
		}
		await shell.openExternal(
			'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'
		);
		return 'Opened Accessibility settings.';
	}
}

export class OpenScreenRecordingTool extends Tool {
	name = 'open_screen_recording_settings';
	description =
		'Open the OS Screen Recording privacy settings (macOS only). On other platforms returns an error.';
	parameters = {
		type: 'object',
		properties: {},
		additionalProperties: false,
	};

	async execute(): Promise<string> {
		if (process.platform !== 'darwin') {
			return 'Error: open_screen_recording_settings is only supported on macOS';
		}
		await shell.openExternal(
			'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture'
		);
		return 'Opened Screen Recording settings.';
	}
}

export class SetMenuBarTool extends Tool {
	name = 'set_menu_bar';
	description = 'Show or hide the menu bar (system tray) icon.';
	parameters = {
		type: 'object',
		properties: {
			enabled: {
				type: 'boolean',
				description: 'true to show the tray icon, false to hide it.',
			},
		},
		required: ['enabled'],
		additionalProperties: false,
	};

	constructor(private readonly eventBus: EventBus) {
		super();
	}

	async execute(args: Record<string, unknown>): Promise<string> {
		const enabled = boolArg(args, ['enabled', 'show', 'visible']);
		if (enabled === null) {
			return 'Error: enabled must be a boolean';
		}
		this.eventBus.emit('tray:set-enabled', { enabled });
		return `Menu bar ${enabled ? 'shown' : 'hidden'}.`;
	}
}
