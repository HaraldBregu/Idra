import {
	app,
	BrowserWindow,
	clipboard,
	dialog,
	ipcMain,
	Menu,
	nativeImage,
	shell,
	systemPreferences,
	type IpcMainInvokeEvent,
} from 'electron';
import { realpathSync } from 'node:fs';
import { copyFile } from 'node:fs/promises';
import path from 'node:path';
import { agentLocation } from '../shared/agent_location';
import type { IpcModule } from './core/module';
import type { EventBus } from '../app/event_bus';
import type {
	MicrophonePermissionSettings,
	MicrophoneSystemPermissionStatus,
	CameraPermissionSettings,
	CameraSystemPermissionStatus,
	SystemPreferencePaneId,
	AppLanguage,
	AppTheme,
} from '../../shared/app_types';
import { wrapIpcHandler, wrapSimpleHandler } from './core/error_handler';
import { setKeepAwake as applyKeepAwake } from '../app/keep_awake';
import {
	getTrayEnabled as getStoredTrayEnabled,
	setTrayEnabled as setStoredTrayEnabled,
	getKeepAwake as getStoredKeepAwake,
	setKeepAwake as setStoredKeepAwake,
	getLanguage as getStoredLanguage,
	setLanguage as setStoredLanguage,
	getTheme as getStoredTheme,
	setTheme as setStoredTheme,
} from '../app/settings_store';
import { AppChannels } from '../../shared/ipc_channels_definitions';
import type { LoggerService } from '../shared';

export interface AppIpcDeps {
	logger: LoggerService;
}

const SYSTEM_PREFERENCE_PANES: Record<SystemPreferencePaneId, string> = {
	Accessibility: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility',
	ScreenCapture: 'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture',
	Camera: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Camera',
	Microphone: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone',
};

function getMicrophoneSystemStatus(): MicrophoneSystemPermissionStatus {
	if (process.platform !== 'darwin') return 'unknown';

	try {
		return systemPreferences.getMediaAccessStatus('microphone');
	} catch {
		return 'unknown';
	}
}

function canRequestMicrophoneAccess(status: MicrophoneSystemPermissionStatus): boolean {
	return process.platform === 'darwin' && status === 'not-determined';
}

function microphoneSettings(): MicrophonePermissionSettings {
	const systemStatus = getMicrophoneSystemStatus();
	return {
		enabled: true,
		systemStatus,
		canRequest: canRequestMicrophoneAccess(systemStatus),
	};
}

function getCameraSystemStatus(): CameraSystemPermissionStatus {
	if (process.platform !== 'darwin') return 'unknown';
	try {
		return systemPreferences.getMediaAccessStatus('camera');
	} catch {
		return 'unknown';
	}
}

function canRequestCameraAccess(status: CameraSystemPermissionStatus): boolean {
	return process.platform === 'darwin' && status === 'not-determined';
}

function cameraSettings(): CameraPermissionSettings {
	const systemStatus = getCameraSystemStatus();
	return {
		enabled: true,
		systemStatus,
		canRequest: canRequestCameraAccess(systemStatus),
	};
}

async function openPathOrThrow(target: string): Promise<void> {
	const error = await shell.openPath(target);
	if (error) {
		throw new Error(error);
	}
}

async function saveImageAs(imagePath: string, window: BrowserWindow | null): Promise<void> {
	const options = { defaultPath: path.basename(imagePath) };
	const result = window
		? await dialog.showSaveDialog(window, options)
		: await dialog.showSaveDialog(options);
	if (result.canceled || !result.filePath) return;
	await copyFile(imagePath, result.filePath);
}

function validatedAgentImagePath(requestedPath: string): string {
	const root = realpathSync(path.resolve(agentLocation()));
	const real = realpathSync(path.resolve(agentLocation(), requestedPath));
	if (!real.startsWith(root + path.sep)) {
		throw new Error('Image path must be inside the agent data directory.');
	}
	return real;
}

function showImageContextMenu(event: IpcMainInvokeEvent, requestedPath: string): void {
	const imagePath = validatedAgentImagePath(requestedPath);
	const window = BrowserWindow.fromWebContents(event.sender);
	const menu = Menu.buildFromTemplate([
		{ label: 'Open', click: () => void shell.openPath(imagePath) },
		{ label: 'Open File Location', click: () => shell.showItemInFolder(imagePath) },
		{ type: 'separator' },
		{
			label: 'Copy Image',
			click: () => clipboard.writeImage(nativeImage.createFromPath(imagePath)),
		},
		{ label: 'Copy Path', click: () => clipboard.writeText(imagePath) },
		{ type: 'separator' },
		{ label: 'Save As…', click: () => void saveImageAs(imagePath, window) },
	]);
	menu.popup(window ? { window } : {});
}

export class AppIpc implements IpcModule {
	readonly name = 'app';

	private trayEnabled = true;

	register({ logger }: AppIpcDeps, eventBus: EventBus): void {
		// Honor the persisted keep-awake setting on startup
		applyKeepAwake(getStoredKeepAwake());

		// Open application data folder in system file explorer
		ipcMain.handle(
			AppChannels.openAppDataFolder,
			wrapSimpleHandler(async () => {
				await openPathOrThrow(app.getPath('userData'));
			}, AppChannels.openAppDataFolder)
		);

		ipcMain.handle(
			AppChannels.openExternalUrl,
			wrapSimpleHandler(async (url: string) => {
				await shell.openExternal(url);
			}, AppChannels.openExternalUrl)
		);

		ipcMain.handle(
			AppChannels.setTrayEnabled,
			wrapSimpleHandler((enabled: boolean) => {
				this.trayEnabled = enabled;
				eventBus.emit('tray:set-enabled', { enabled });
			}, AppChannels.setTrayEnabled)
		);

		ipcMain.handle(
			AppChannels.getTrayEnabled,
			wrapSimpleHandler(() => {
				return this.trayEnabled;
			}, AppChannels.getTrayEnabled)
		);

		ipcMain.handle(
			AppChannels.setKeepAwake,
			wrapSimpleHandler((enabled: boolean) => {
				setStoredKeepAwake(enabled);
				applyKeepAwake(enabled);
			}, AppChannels.setKeepAwake)
		);

		ipcMain.handle(
			AppChannels.getKeepAwake,
			wrapSimpleHandler(() => {
				return getStoredKeepAwake();
			}, AppChannels.getKeepAwake)
		);

		ipcMain.handle(
			AppChannels.getMicrophonePermission,
			wrapSimpleHandler(() => {
				return microphoneSettings();
			}, AppChannels.getMicrophonePermission)
		);

		ipcMain.handle(
			AppChannels.setMicrophoneEnabled,
			wrapSimpleHandler((_enabled: boolean) => {
				return microphoneSettings();
			}, AppChannels.setMicrophoneEnabled)
		);

		ipcMain.handle(
			AppChannels.requestMicrophonePermission,
			wrapSimpleHandler(async () => {
				if (process.platform === 'darwin') {
					await systemPreferences.askForMediaAccess('microphone');
				}
				return microphoneSettings();
			}, AppChannels.requestMicrophonePermission)
		);

		ipcMain.handle(
			AppChannels.openSystemPreference,
			wrapSimpleHandler(async (pane: SystemPreferencePaneId) => {
				const url = SYSTEM_PREFERENCE_PANES[pane];
				if (!url) {
					throw new Error(`Unknown system preference pane: ${pane}`);
				}
				await shell.openExternal(url);
			}, AppChannels.openSystemPreference)
		);

		ipcMain.handle(
			AppChannels.getCameraPermission,
			wrapSimpleHandler(() => {
				return cameraSettings();
			}, AppChannels.getCameraPermission)
		);

		ipcMain.handle(
			AppChannels.setCameraEnabled,
			wrapSimpleHandler((_enabled: boolean) => {
				return cameraSettings();
			}, AppChannels.setCameraEnabled)
		);

		ipcMain.handle(
			AppChannels.showImageContextMenu,
			wrapIpcHandler((event, imagePath: string) => {
				showImageContextMenu(event, imagePath);
			}, AppChannels.showImageContextMenu)
		);

		ipcMain.handle(
			AppChannels.requestCameraPermission,
			wrapSimpleHandler(async () => {
				if (process.platform === 'darwin') {
					await systemPreferences.askForMediaAccess('camera');
				}
				return cameraSettings();
			}, AppChannels.requestCameraPermission)
		);

		logger.info('AppIpc', `Registered ${this.name} module`);
	}
}
