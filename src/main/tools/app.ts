import fs from 'node:fs/promises';
import path from 'node:path';
import { app, nativeTheme, shell } from 'electron';
import type { AgentTool, ToolContext } from './types';
import { textResult } from './types';

type ThemeMode = 'light' | 'dark' | 'system';

interface SetThemeArgs {
	mode: ThemeMode;
}

interface OpenFolderArgs {
	path?: string;
}

function isInside(parent: string, child: string): boolean {
	const relative = path.relative(parent, child);
	return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

async function openPath(target: string, toolName: string, ctx: ToolContext) {
	const err = await shell.openPath(target);
	if (err) {
		ctx.services.logger.warn(toolName, `openPath failed: ${err}`);
		return textResult(err, true);
	}
	return textResult(`Opened ${target}`);
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
		return openPath(target, 'open_app_data_folder', ctx);
	},
};

export const openUserDataFolderTool: AgentTool = {
	name: 'open_user_data_folder',
	description: "Open Friday's user-owned .friday folder in the OS file manager.",
	schema: { type: 'object', properties: {}, additionalProperties: false },
	async execute(_args, ctx) {
		const target = await ctx.services.userDataDirectory.ensureRoot();
		return openPath(target, 'open_user_data_folder', ctx);
	},
};

export const openFolderTool: AgentTool<OpenFolderArgs> = {
	name: 'open_folder',
	description: 'Open a workspace folder in the OS file manager. Defaults to the workspace root.',
	schema: {
		type: 'object',
		properties: {
			path: {
				type: 'string',
				description: 'Folder path to open, relative to the workspace. Defaults to ".".',
			},
		},
		additionalProperties: false,
	},
	async execute(args, ctx) {
		const requested = String(args.path ?? '.').trim() || '.';
		const workspace = await fs.realpath(ctx.workspace);
		const target = path.isAbsolute(requested)
			? path.resolve(requested)
			: path.resolve(workspace, requested);
		let resolvedTarget: string;
		let stat;

		try {
			resolvedTarget = await fs.realpath(target);
			stat = await fs.stat(resolvedTarget);
		} catch {
			return textResult(`open_folder: folder does not exist: ${requested}`, true);
		}

		if (!isInside(workspace, resolvedTarget)) {
			return textResult(`open_folder: path is outside the workspace: ${requested}`, true);
		}
		if (!stat.isDirectory()) {
			return textResult(`open_folder: path is not a folder: ${requested}`, true);
		}

		return openPath(resolvedTarget, 'open_folder', ctx);
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

interface OpenBrowserArgs {
	url: string;
}

export const openBrowserTool: AgentTool<OpenBrowserArgs> = {
	name: 'open_browser',
	description: "Open a URL in the user's default browser.",
	schema: {
		type: 'object',
		properties: { url: { type: 'string', description: 'The http or https URL to open.' } },
		required: ['url'],
		additionalProperties: false,
	},
	async execute(args) {
		const url = String(args.url ?? '').trim();
		if (!/^https?:\/\//i.test(url)) {
			return textResult('open_browser: only http and https URLs are supported', true);
		}
		await shell.openExternal(url);
		return textResult(`Opened ${url}`);
	},
};
