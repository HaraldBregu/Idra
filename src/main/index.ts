import { app, BrowserWindow, crashReporter, nativeTheme } from 'electron';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Main } from './app/create_window';
import { Tray } from './app/tray';
import { setTrayEnabled } from './app/set_tray_enabled';
import {
	getTrayEnabled,
	getLanguage,
	setLanguage as setStoredLanguage,
	getTheme,
} from './app/settings_store';
import type { AppLanguage } from '../shared/app_types';
import { Menu } from './app/menu';
import {
	ensureExtensions,
	listExtensions,
	loadExtension,
	watchExtensions,
} from './extensions/extension_index';
import { ShortcutManager } from './app/shortcuts';
import { setupAppLifecycle } from './app/lifecycle';
import {
	registerLocalResourceProtocolHandler,
	registerLocalResourceProtocolScheme,
	setupMediaPermissionHandlers,
} from './app/protocol';
import { registerIpcHandlers } from './ipc/core/register_ipc_handlers';
import { setupEventLogging, setupProcessSafetyNet } from './shared/error_reporter';
import { setupMemoryMonitor } from './shared/metrics';
import { bootstrapServices, cleanup } from './bootstrap';
import { sync as syncSkills } from './agent/skills';
import { startStorageSync, stopStorageSync } from './app/storage';
import { startRagSchedule, stopRagSchedule } from './rag';
import { CHANNEL_PROVIDER_IDS } from '../shared';
import { startWiki, stopWiki } from './wiki';

// // DIAG: bump V8 old-space heap to confirm whether crashes (Chromium OOM,
// // exception 0xE0000008) come from the V8/JS heap or from native/C++
// // allocations. Must run before V8 isolates fully initialize. If crashes
// // take noticeably longer with this set, the leak is JS-side.
// app.commandLine.appendSwitch('js-flags', '--max-old-space-size=8192');
// if (process.platform === 'linux') {
// 	app.commandLine.appendSwitch('enable-transparent-visuals');
// }

function loadLocalEnv(): void {
	const paths = Array.from(
		new Set([resolve(process.cwd(), '.env'), resolve(app.getAppPath(), '.env')])
	);

	for (const envPath of paths) {
		if (!existsSync(envPath)) continue;
		const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith('#')) continue;
			const separatorIndex = trimmed.indexOf('=');
			if (separatorIndex <= 0) continue;
			const key = trimmed.slice(0, separatorIndex).trim();
			const rawValue = trimmed.slice(separatorIndex + 1).trim();
			if (!key || process.env[key]?.trim()) continue;
			process.env[key] = rawValue.replace(/^(['"])(.*)\1$/, '$2');
		}
	}
}

loadLocalEnv();
registerLocalResourceProtocolScheme();

// Install process-level safety net BEFORE anything else so we can see silent exits.
setupProcessSafetyNet();

// Start Chromium crash capture as early as possible so renderer/process
// crashes produce dumps instead of only a generic Crashpad stderr line.
try {
	const crashDumpsPath = app.getPath('crashDumps');
	// eslint-disable-next-line no-console
	console.log(`[CrashReporter] crash dumps path: ${crashDumpsPath}`);
	crashReporter.start({
		submitURL: '',
		uploadToServer: false,
	});
} catch (error) {
	// eslint-disable-next-line no-console
	console.error('[CrashReporter] Failed to start', error);
}

// Bootstrap new architecture - FULL INTEGRATION ENABLED
const services = bootstrapServices();
const { eventBus, appState, windowFactory, logger, windowContextManager, agentService } = services;
agentService.start(logger);
startStorageSync(logger);
startRagSchedule(logger);
// Re-bind safety net with the real logger now that it exists.
setupProcessSafetyNet(logger);
setupMemoryMonitor(logger);
logger.info('CrashReporter', `Crash dumps path: ${app.getPath('crashDumps')}`);
logger.info('Main', 'Starting app');
logger.info('Main', 'Enabling IPC modules...');
registerIpcHandlers(services, eventBus);
setupAppLifecycle(appState, logger);
setupEventLogging(logger);

const shortcutManager = new ShortcutManager();

app.on('browser-window-created', (_event, win) => {
	shortcutManager.attach(win);
});

const mainWindow = new Main(appState, windowFactory, windowContextManager);

const trayManager = new Tray({
	onToggleApp: () => mainWindow.toggleVisibility(),
	onQuit: () => {
		appState.setQuitting();
		app.quit();
	},
	isAppVisible: () => mainWindow.isVisible(),
});

const menuManager = new Menu({
	onLanguageChange: (lng) => {
		setStoredLanguage(lng as AppLanguage);
		trayManager.updateLanguage(lng);
		BrowserWindow.getAllWindows().forEach((win) => {
			win.webContents.send('change-language', lng);
		});
	},
	onNewWindow: () => {
		logger.info('Menu', 'Creating new launcher window');
		mainWindow.createAdditionalWindow();
	},
	getExtensions: () => listExtensions(),
	onOpenExtension: (extension) => loadExtension(windowFactory, extension),
});

app.whenReady().then(async () => {
	registerLocalResourceProtocolHandler(logger);
	setupMediaPermissionHandlers();
	ensureExtensions();
	const stopWatchingExtensions = watchExtensions(
		() => menuManager.create(),
		(error) => logger.error('Extensions', 'Extension watcher failed', error)
	);
	app.once('before-quit', () => {
		void stopWatchingExtensions();
	});
	syncSkills();
	startWiki();
	// Apply persisted settings on startup (updateLanguage builds the menu)
	const storedLanguage = getLanguage();
	menuManager.updateLanguage(storedLanguage);
	setTrayEnabled(trayManager, getTrayEnabled());
	trayManager.updateLanguage(storedLanguage);
	nativeTheme.themeSource = getTheme();

	// Toggle tray from renderer settings
	eventBus.on('tray:set-enabled', (event) => {
		const { enabled } = event.payload as { enabled: boolean };
		setTrayEnabled(trayManager, enabled);
	});

	// Sync native menu + tray when language changes from renderer settings
	eventBus.on('language:changed', (event) => {
		const { language } = event.payload as { language: AppLanguage };
		menuManager.updateLanguage(language);
		trayManager.updateLanguage(language);
	});

	// Create main window
	mainWindow.create();

	// Start enabled messaging channels (registry skips disabled/unconfigured ones)
	for (const channel of CHANNEL_PROVIDER_IDS) {
		services.channelRegistry.start(channel).catch((error) => {
			logger.error('Main', `Failed to start ${channel} channel`, error);
		});
	}

	// Update tray menu when window visibility changes
	mainWindow.setOnWindowVisibilityChange(() => {
		trayManager.updateContextMenu();
	});

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0 && !trayManager.isCreated()) {
			mainWindow.create();
		}
	});
});

// Core window and quit-state handlers are managed by setupAppLifecycle.

app.on('quit', () => {
	stopStorageSync();
	stopRagSchedule();
	stopWiki();
	agentService.destroy();
	cleanup(services);
});
