import {
	app,
	BrowserWindow,
	clipboard,
	dialog,
	ipcMain,
	Menu,
	nativeImage,
	nativeTheme,
	shell,
	systemPreferences,
	type IpcMainInvokeEvent,
} from 'electron';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { copyFile, cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { agentLocation } from '../shared/agent_location';
import { libraryLocation } from '../shared/library_location';
import { userDataLocation } from '../shared/user_data_location';
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
import {
	loadBots,
	loadDatabases,
	loadMcps,
	loadModels,
	loadStorages,
	loadWebSearches,
	providersDir,
	refreshProviderCatalog,
	watchModels,
} from '../app/models';
import type { LoggerService } from '../shared';
import { validateProviderManifest } from '../../shared/providers/validation';
import type { Channel, ChannelStatusEvent, ChannelType } from '../../shared';
import {
	getChannels,
	setChannelConfig,
	setChannelId,
	setProviderId,
	type ChannelRegistry,
} from '../app/channels';

export interface AppIpcDeps {
	logger: LoggerService;
	channelRegistry: ChannelRegistry;
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

function readProviderFile(dir: string, file: string): unknown {
	const filePath = path.join(dir, file);
	if (!existsSync(filePath)) return undefined;
	try {
		return JSON.parse(readFileSync(filePath, 'utf-8'));
	} catch {
		throw new Error(`Invalid provider format: ${file} is not valid JSON.`);
	}
}

async function uploadProvider(
	event: IpcMainInvokeEvent,
	onCatalogChange: () => void
): Promise<string | null> {
	const window = BrowserWindow.fromWebContents(event.sender);
	const options: Electron.OpenDialogOptions = { properties: ['openDirectory'] };
	const result = window
		? await dialog.showOpenDialog(window, options)
		: await dialog.showOpenDialog(options);
	const source = result.filePaths[0];
	if (result.canceled || !source) return null;

	const manifest = readProviderFile(source, 'manifest.json');
	if (manifest === undefined) {
		throw new Error('Selected folder is not a provider (missing manifest.json).');
	}
	const errors = validateProviderManifest(manifest);
	if (errors.length > 0) {
		throw new Error(`Invalid provider format: ${errors.join(' ')}`);
	}

	const name = path.basename(source);
	await mkdir(providersDir(), { recursive: true });
	await cp(source, path.join(providersDir(), name), { recursive: true });
	onCatalogChange();
	return name;
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
	const roots = [agentLocation(), libraryLocation()];
	for (const root of roots) {
		try {
			const realRoot = realpathSync(path.resolve(root));
			const real = realpathSync(path.resolve(root, requestedPath));
			if (real.startsWith(realRoot + path.sep)) return real;
		} catch {
			// Root or file missing under this root; try the next one.
		}
	}
	throw new Error('Image path must be inside the agent or library data directory.');
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

function validatedAudioPath(requestedPath: string): string {
	const roots = [agentLocation(), libraryLocation(), path.resolve(userDataLocation(), 'sound')];
	for (const root of roots) {
		try {
			const realRoot = realpathSync(path.resolve(root));
			const real = realpathSync(path.resolve(root, requestedPath));
			if (real.startsWith(realRoot + path.sep)) return real;
		} catch {
			// Root or file missing under this root; try the next one.
		}
	}
	throw new Error('Audio path must be inside the agent or sound data directory.');
}

function showAudioContextMenu(event: IpcMainInvokeEvent, requestedPath: string): void {
	const audioPath = validatedAudioPath(requestedPath);
	const window = BrowserWindow.fromWebContents(event.sender);
	const menu = Menu.buildFromTemplate([
		{ label: 'Open', click: () => void shell.openPath(audioPath) },
		{ label: 'Open File Location', click: () => shell.showItemInFolder(audioPath) },
		{ type: 'separator' },
		{ label: 'Copy Path', click: () => clipboard.writeText(audioPath) },
		{ type: 'separator' },
		{ label: 'Save As…', click: () => void saveImageAs(audioPath, window) },
	]);
	menu.popup(window ? { window } : {});
}

function validatedVideoPath(requestedPath: string): string {
	const roots = [agentLocation(), libraryLocation(), path.resolve(userDataLocation(), 'video')];
	for (const root of roots) {
		try {
			const realRoot = realpathSync(path.resolve(root));
			const real = realpathSync(path.resolve(root, requestedPath));
			if (real.startsWith(realRoot + path.sep)) return real;
		} catch {
			// Root or file missing under this root; try the next one.
		}
	}
	throw new Error('Video path must be inside the agent or video data directory.');
}

function showVideoContextMenu(event: IpcMainInvokeEvent, requestedPath: string): void {
	const videoPath = validatedVideoPath(requestedPath);
	const window = BrowserWindow.fromWebContents(event.sender);
	const menu = Menu.buildFromTemplate([
		{ label: 'Open', click: () => void shell.openPath(videoPath) },
		{ label: 'Open File Location', click: () => shell.showItemInFolder(videoPath) },
		{ type: 'separator' },
		{ label: 'Copy Path', click: () => clipboard.writeText(videoPath) },
		{ type: 'separator' },
		{ label: 'Save As…', click: () => void saveImageAs(videoPath, window) },
	]);
	menu.popup(window ? { window } : {});
}

export class AppIpc implements IpcModule {
	readonly name = 'app';

	register({ logger, channelRegistry }: AppIpcDeps, eventBus: EventBus): void {
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
			AppChannels.openDataFolder,
			wrapSimpleHandler(async () => {
				await mkdir(userDataLocation(), { recursive: true });
				await openPathOrThrow(userDataLocation());
			}, AppChannels.openDataFolder)
		);

		ipcMain.handle(
			AppChannels.openProvidersFolder,
			wrapSimpleHandler(async () => {
				await openPathOrThrow(providersDir());
			}, AppChannels.openProvidersFolder)
		);

		ipcMain.handle(
			AppChannels.models,
			wrapSimpleHandler(() => {
				return [...loadModels()];
			}, AppChannels.models)
		);

		ipcMain.handle(
			AppChannels.databases,
			wrapSimpleHandler(() => {
				return [...loadDatabases()];
			}, AppChannels.databases)
		);

		ipcMain.handle(
			AppChannels.storages,
			wrapSimpleHandler(() => {
				return [...loadStorages()];
			}, AppChannels.storages)
		);

		ipcMain.handle(
			AppChannels.webSearches,
			wrapSimpleHandler(() => {
				return [...loadWebSearches()];
			}, AppChannels.webSearches)
		);

		ipcMain.handle(
			AppChannels.mcps,
			wrapSimpleHandler(() => {
				return [...loadMcps()];
			}, AppChannels.mcps)
		);

		ipcMain.handle(
			AppChannels.bots,
			wrapSimpleHandler(() => {
				return [...loadBots()];
			}, AppChannels.bots)
		);

		// Re-read the catalog and tell renderers when resources/providers changes on disk
		watchModels(() => eventBus.broadcast(AppChannels.modelsChanged));

		ipcMain.handle(
			AppChannels.openExternalUrl,
			wrapSimpleHandler(async (url: string) => {
				await shell.openExternal(url);
			}, AppChannels.openExternalUrl)
		);

		ipcMain.handle(
			AppChannels.setTrayEnabled,
			wrapSimpleHandler((enabled: boolean) => {
				setStoredTrayEnabled(enabled);
				eventBus.emit('tray:set-enabled', { enabled });
			}, AppChannels.setTrayEnabled)
		);

		ipcMain.handle(
			AppChannels.getTrayEnabled,
			wrapSimpleHandler(() => {
				return getStoredTrayEnabled();
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
			AppChannels.setLanguage,
			wrapSimpleHandler((language: AppLanguage) => {
				setStoredLanguage(language);
				eventBus.emit('language:changed', { language });
			}, AppChannels.setLanguage)
		);

		ipcMain.handle(
			AppChannels.getLanguage,
			wrapSimpleHandler(() => {
				return getStoredLanguage();
			}, AppChannels.getLanguage)
		);

		ipcMain.handle(
			AppChannels.setTheme,
			wrapSimpleHandler((theme: AppTheme) => {
				setStoredTheme(theme);
				nativeTheme.themeSource = theme;
			}, AppChannels.setTheme)
		);

		ipcMain.handle(
			AppChannels.getTheme,
			wrapSimpleHandler(() => {
				return getStoredTheme();
			}, AppChannels.getTheme)
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
			AppChannels.openVideo,
			wrapSimpleHandler(async (videoPath: string) => {
				await openPathOrThrow(validatedVideoPath(videoPath));
			}, AppChannels.openVideo)
		);

		ipcMain.handle(
			AppChannels.showImageContextMenu,
			wrapIpcHandler((event, imagePath: string) => {
				showImageContextMenu(event, imagePath);
			}, AppChannels.showImageContextMenu)
		);

		ipcMain.handle(
			AppChannels.showVideoContextMenu,
			wrapIpcHandler((event, videoPath: string) => {
				showVideoContextMenu(event, videoPath);
			}, AppChannels.showVideoContextMenu)
		);

		ipcMain.handle(
			AppChannels.showAudioContextMenu,
			wrapIpcHandler((event, audioPath: string) => {
				showAudioContextMenu(event, audioPath);
			}, AppChannels.showAudioContextMenu)
		);

		ipcMain.handle(
			AppChannels.uploadProvider,
			wrapIpcHandler((event) => {
				return uploadProvider(event, () => {
					refreshProviderCatalog();
					eventBus.broadcast(AppChannels.modelsChanged);
				});
			}, AppChannels.uploadProvider)
		);

		ipcMain.handle(
			AppChannels.getChannels,
			wrapSimpleHandler((): Channel => {
				return getChannels();
			}, AppChannels.getChannels)
		);

		ipcMain.handle(
			AppChannels.setDefaultChannel,
			wrapSimpleHandler((providerId: string, channelId: string): void => {
				setProviderId(providerId);
				setChannelId(channelId);
			}, AppChannels.setDefaultChannel)
		);

		ipcMain.handle(
			AppChannels.getChannelsStatus,
			wrapSimpleHandler((type?: ChannelType): ChannelStatusEvent | undefined => {
				return channelRegistry.getStatus(type);
			}, AppChannels.getChannelsStatus)
		);

		ipcMain.handle(
			AppChannels.startTelegram,
			wrapSimpleHandler(async (): Promise<ChannelStatusEvent | undefined> => {
				await channelRegistry.start('telegram');
				return channelRegistry.getStatus('telegram');
			}, AppChannels.startTelegram)
		);

		ipcMain.handle(
			AppChannels.stopTelegram,
			wrapSimpleHandler(async (): Promise<void> => {
				await channelRegistry.stop('telegram');
			}, AppChannels.stopTelegram)
		);

		ipcMain.handle(
			AppChannels.restartTelegram,
			wrapSimpleHandler(async (): Promise<ChannelStatusEvent | undefined> => {
				await channelRegistry.restart('telegram');
				return channelRegistry.getStatus('telegram');
			}, AppChannels.restartTelegram)
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
