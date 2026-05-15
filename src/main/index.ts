import { app, BrowserWindow, nativeTheme, protocol, net, crashReporter } from 'electron';
import { pathToFileURL } from 'node:url';
import { Main } from './main';
import { Tray } from './tray';
import { Menu } from './menu';
import { ShortcutManager } from './shortcuts';

// DIAG: bump V8 old-space heap to confirm whether crashes (Chromium OOM,
// exception 0xE0000008) come from the V8/JS heap or from native/C++
// allocations. Must run before V8 isolates fully initialize. If crashes
// take noticeably longer with this set, the leak is JS-side.
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=8192');
if (process.platform === 'linux') {
	app.commandLine.appendSwitch('enable-transparent-visuals');
}

// Register custom scheme before app is ready so the renderer can load local files.
protocol.registerSchemesAsPrivileged([
	{
		scheme: 'local-resource',
		privileges: { standard: true, secure: true, bypassCSP: true, supportFetchAPI: true },
	},
]);

import type { ThemeMode } from '../shared';
import {
	bootstrapServices,
	bootstrapIpcModules,
	setupAppLifecycle,
	setupEventLogging,
	setupProcessSafetyNet,
	setupMemoryMonitor,
	cleanup,
	writeCrashLine,
} from './bootstrap';

// Install process-level safety net BEFORE anything else so we can see silent exits.
setupProcessSafetyNet();

// Wrap app.quit to capture the JS call site. Electron emits before-quit
// asynchronously, so the safety-net before-quit stack only shows EventEmitter
// frames — useless for finding which line called quit. Wrapping here records
// the original caller's stack synchronously to crash.log.
const originalAppQuit = app.quit.bind(app);
app.quit = function quitWithTrace(): void {
	const stack = new Error('app.quit call site').stack;
	writeCrashLine(`[app.quit:called]\n${stack}`);
	return originalAppQuit();
};
const originalAppExit = app.exit.bind(app);
app.exit = function exitWithTrace(code?: number): void {
	const stack = new Error('app.exit call site').stack;
	writeCrashLine(`[app.exit:called] code=${code}\n${stack}`);
	return originalAppExit(code);
};

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
const { container, eventBus, appState, windowFactory, logger, windowContextManager } =
	bootstrapServices();
// Re-bind safety net with the real logger now that it exists.
setupProcessSafetyNet(logger);
setupMemoryMonitor(logger);
logger.info('CrashReporter', `Crash dumps path: ${app.getPath('crashDumps')}`);
logger.info('Main', 'Starting app');
logger.info('Main', 'Enabling IPC modules...');
bootstrapIpcModules(container, eventBus);
setupAppLifecycle(appState, logger);
setupEventLogging(logger);

const shortcutManager = new ShortcutManager();

app.on('browser-window-created', (_event, win) => {
	shortcutManager.attach(win);
});

const mainWindow = new Main(appState, windowFactory, windowContextManager);

const trayManager = new Tray({
	onShowApp: () => mainWindow.showOrCreate(),
	onHideApp: () => mainWindow.hide(),
	onToggleApp: () => mainWindow.toggleVisibility(),
	onQuit: () => {
		appState.setQuitting();
		app.quit();
	},
	isAppVisible: () => mainWindow.isVisible(),
});

const appsService = container.get('apps');

const menuManager = new Menu(
	{
		onLanguageChange: (lng) => {
			trayManager.updateLanguage(lng);
			BrowserWindow.getAllWindows().forEach((win) => {
				win.webContents.send('change-language', lng);
			});
		},
		onThemeChange: (theme) => {
			nativeTheme.themeSource = theme;
			BrowserWindow.getAllWindows().forEach((win) => {
				win.webContents.send('change-theme', theme);
			});
		},
		onNewWindow: () => {
			logger.info('Menu', 'Creating new launcher window');
			mainWindow.createAdditionalWindow();
		},
	},
	appsService,
	logger
);

app.whenReady().then(async () => {
	// Serve local files via the local-resource:// protocol so the renderer
	// can display images stored in document folders regardless of its origin.
	protocol.handle('local-resource', (request) => {
		try {
			const url = new URL(request.url);
			let pathname = decodeURIComponent(url.pathname);
			// On Windows, URL pathname is "/C:/foo"; strip the leading slash so
			// pathToFileURL produces a canonical "file:///C:/foo".
			if (process.platform === 'win32' && /^\/[A-Za-z]:/.test(pathname)) {
				pathname = pathname.slice(1);
			}
			return net.fetch(pathToFileURL(pathname).toString());
		} catch (err) {
			logger.error('App', `local-resource fetch failed for ${request.url}`, err);
			return new Response(null, { status: 500 });
		}
	});

	menuManager.create();
	void menuManager.refreshApps();
	trayManager.create();

	// Sync menu radio buttons when theme changes from renderer
	eventBus.on('theme:changed', (event) => {
		const { theme } = event.payload as { theme: ThemeMode };
		menuManager.updateTheme(theme);
	});

	// Toggle tray from renderer settings
	eventBus.on('tray:set-enabled', (event) => {
		const { enabled } = event.payload as { enabled: boolean };
		if (enabled && !trayManager.isCreated()) {
			trayManager.create();
		} else if (!enabled && trayManager.isCreated()) {
			trayManager.destroy();
		}
	});

	// Create main window
	mainWindow.create();

	// Update tray menu when window visibility changes
	mainWindow.setOnWindowVisibilityChange(() => {
		trayManager.updateContextMenu();
	});

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			mainWindow.create();
		}
	});
});

// Note: window-all-closed and before-quit handlers are now managed by setupAppLifecycle

app.on('quit', () => {
	cleanup(container);
});
