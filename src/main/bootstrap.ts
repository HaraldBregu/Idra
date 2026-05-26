import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

import { ServiceContainer, EventBus, WindowFactory, AppState, WindowContextManager } from './core';

import { AppPermissionsService } from './app-permissions';
import { LoggerService } from './logger';
import { StoreService } from './store';
import { PolicyService } from './policy';
import { CronService } from './cron';
import { ChannelRegistry, ChannelsService } from './channels';
import {
	AgentService,
	type AgentServiceDependencies,
	SubagentRegistry,
	SubagentRunTaskHandler,
	SubagentSpawnService,
} from './agent';
import { WorkspaceService } from './workspace';
import { ConnectorsService } from './connectors';
import { McpRegistry } from './mcp';
import { MonitorService } from './monitor';
import { TasksService } from './tasks';
import { UserDataDirectoryService } from './user-data';
import { createElectronPowerSaveBlockerService } from './power-save-blocker';
import { ToolService } from './tools';
import { SkillsService } from './skills';
import { SpeechToTextService } from './stt';
import { TextToSpeechService } from './tts';

import type { IpcModule } from './ipc';
import {
	AppIpc,
	AgentIpc,
	ChannelsIpc,
	ConnectorsIpc,
	CronIpc,
	HeartbeatIpc,
	MonitorIpc,
	PolicyIpc,
	RealtimeTranscriptionIpc,
	SpeechToTextIpc,
	SkillsIpc,
	StoreIpc,
	TasksIpc,
	WindowIpc,
} from './ipc';
import type { MainServiceContainer, MainServices } from './service-registry';
import { HeartbeatService } from './heartbeat';

export interface BootstrapResult {
	container: MainServiceContainer;
	eventBus: EventBus;
	windowFactory: WindowFactory;
	appState: AppState;
	logger: LoggerService;
	userDataDirectory: UserDataDirectoryService;
	workspace: WorkspaceService;
	windowContextManager: WindowContextManager<MainServices>;
}

export function bootstrapServices(): BootstrapResult {
	const appState = new AppState();
	const container = new ServiceContainer<MainServices>();
	const eventBus = new EventBus();

	container.register('appState', appState);
	container.register('eventBus', eventBus);

	const logger = new LoggerService(eventBus);
	container.register('logger', logger);
	const monitor = container.register('monitor', new MonitorService({ eventBus, logger }));
	monitor.start();
	container.register('appPermissions', new AppPermissionsService());
	container.register('skills', new SkillsService(logger));

	const userDataDirectory = container.register('userDataDirectory', new UserDataDirectoryService());
	void userDataDirectory.ensureRoot().catch((error) => {
		logger.error('UserDataDirectoryService', 'Failed to create user data directory', error);
	});

	const workspace = container.register(
		'workspace',
		new WorkspaceService(logger, { userDataDirectory })
	);
	const store = container.register('store', new StoreService(logger));
	const channels = container.register('channels', new ChannelsService(logger));
	const policy = container.register(
		'policy',
		new PolicyService({
			workspaceRoot: workspace.getRootPath(),
			agentRoot: userDataDirectory.resolve('agent'),
			logger,
		})
	);
	container.register('powerSaveBlocker', createElectronPowerSaveBlockerService());
	const cron = container.register('cron', new CronService(logger, { store }));
	cron.restore((task) => {
		logger.info('CronService', `Tick (restored): ${task.id} '${task.expression}'`);
	});

	const mcpRegistry = container.register('mcpRegistry', new McpRegistry());

	const connectors = container.register('connectors', new ConnectorsService(logger));
	connectors.restoreEnabledConnectors();
	container.register('speechToText', new SpeechToTextService({ store, logger }));
	container.register('textToSpeech', new TextToSpeechService({ store, logger }));
	const toolService = container.register('toolService', new ToolService({ policy, cron, logger }));

	const subagentRegistry = new SubagentRegistry();
	const taskManager = container.register(
		'taskManager',
		new TasksService({
			store,
			eventBus,
			logger,
		})
	);

	const agentDependencies: AgentServiceDependencies = {
		store,
		cron,
		logger,
		eventBus,
		workspace,
		userDataDirectory,
		connectors,
		skills,
		mcpRegistry,
		policy,
		toolService,
		taskManager,
	};
	const agentService = container.register('agentService', new AgentService(agentDependencies));
	taskManager.configureAgentRuntime(agentService);
	taskManager.registerHandler(new SubagentRunTaskHandler(agentService, subagentRegistry, eventBus));
	agentDependencies.subagents = new SubagentSpawnService({
		store,
		taskManager,
		registry: subagentRegistry,
		eventBus,
		logger,
	});
	const channelRegistry = container.register(
		'channelRegistry',
		new ChannelRegistry({ logger, eventBus, agentService, store })
	);
	const heartbeat = container.register(
		'heartbeat',
		new HeartbeatService({
			store,
			channels,
			logger,
			eventBus,
			agentService,
			workspace,
			channelRegistry,
		})
	);
	heartbeat.start();
	void cron.start().catch((error) => {
		logger.error('CronService', 'Failed to start persistent cron scheduler', error);
	});

	const windowFactory = new WindowFactory(logger);
	container.register('windowFactory', windowFactory);

	const windowContextManager = new WindowContextManager(container, eventBus);
	container.register('windowContextManager', windowContextManager);

	logger.info('Bootstrap', `Registered ${container.has('store') ? 'all' : 'some'} global services`);

	return {
		container,
		eventBus,
		windowFactory,
		appState,
		logger,
		userDataDirectory,
		workspace,
		windowContextManager,
	};
}

export function restorePowerSaveBlocker(container: MainServiceContainer): void {
	const store = container.get('store');
	if (!store.getKeepAwakeEnabled()) return;

	const logger = container.get('logger');
	const powerSaveBlocker = container.get('powerSaveBlocker');
	try {
		const enabled = powerSaveBlocker.setEnabled(true);
		store.setKeepAwakeEnabled(enabled);
	} catch (error) {
		store.setKeepAwakeEnabled(false);
		logger.error('PowerSaveBlocker', 'Failed to restore keep-awake setting', error);
	}
}

export function bootstrapIpcModules(container: MainServiceContainer, eventBus: EventBus): void {
	const logger = container.get('logger');

	const ipcModules: IpcModule[] = [
		new AppIpc(),
		new AgentIpc(),
		new ChannelsIpc(),
		new ConnectorsIpc(),
		new CronIpc(),
		new HeartbeatIpc(),
		new MonitorIpc(),
		new PolicyIpc(),
		new RealtimeTranscriptionIpc(),
		new SpeechToTextIpc(),
		new SkillsIpc(),
		new StoreIpc(),
		new TasksIpc(),
		new WindowIpc(),
	];

	for (const module of ipcModules) {
		try {
			module.register(container, eventBus);
		} catch (error) {
			logger.error('Bootstrap', `Failed to register IPC module: ${module.name}`, error);
		}
	}

	logger.info('Bootstrap', `Registered ${ipcModules.length} IPC modules`);
}

let safetyNetLogger: LoggerService | null = null;
let safetyNetInstalled = false;
let safetyNetCrashFile: string | null = null;

/**
 * Periodic memory snapshot.
 *
 * Categorises growth so we can tell V8/JS leaks (heapUsed) from native
 * leaks (rss - heapUsed - external) from buffer leaks (external/arrayBuffers).
 * Writes to the regular logger and to crash.log so the last snapshot
 * survives a hard crash that kills the buffered logger.
 */
let memoryMonitorInterval: NodeJS.Timeout | null = null;

export function setupMemoryMonitor(logger: LoggerService, intervalMs = 30_000): void {
	if (memoryMonitorInterval) return;
	const sample = (): void => {
		const m = process.memoryUsage();
		const mb = (n: number): number => Math.round(n / 1024 / 1024);
		const line =
			`[mem] rss=${mb(m.rss)}MB heapUsed=${mb(m.heapUsed)}MB ` +
			`heapTotal=${mb(m.heapTotal)}MB external=${mb(m.external)}MB ` +
			`arrayBuffers=${mb(m.arrayBuffers)}MB`;
		logger.info('MemoryMonitor', line);
		writeCrashLine(line);
	};
	sample();
	memoryMonitorInterval = setInterval(sample, intervalMs);
	memoryMonitorInterval.unref?.();
}

export function writeCrashLine(line: string): void {
	// Write synchronously to a dedicated file so we capture the reason even
	// when the process is torn down before the buffered LoggerService flushes.
	try {
		if (!safetyNetCrashFile) {
			const dir = path.join(app.getPath('userData'), 'logs');
			fs.mkdirSync(dir, { recursive: true });
			safetyNetCrashFile = path.join(dir, 'crash.log');
		}
		const stamp = new Date().toISOString();
		fs.appendFileSync(safetyNetCrashFile, `[${stamp}] [pid=${process.pid}] ${line}\n`);
	} catch {
		// swallow — we are likely mid-exit
	}
}

export function setupProcessSafetyNet(logger?: LoggerService): void {
	if (logger) {
		safetyNetLogger = logger;
	}
	if (safetyNetInstalled) {
		return;
	}
	safetyNetInstalled = true;

	writeCrashLine(`[boot] pid=${process.pid} argv=${process.argv.join(' ')}`);

	process.on('uncaughtException', (error, origin) => {
		const message = error instanceof Error ? error.stack || error.message : String(error);
		writeCrashLine(`[uncaughtException:${origin}] ${message}`);
		safetyNetLogger?.error('Process', `uncaughtException (${origin})`, { error: message });
		// eslint-disable-next-line no-console
		console.error(`[uncaughtException:${origin}]`, message);
	});

	process.on('unhandledRejection', (reason) => {
		const message = reason instanceof Error ? reason.stack || reason.message : String(reason);
		writeCrashLine(`[unhandledRejection] ${message}`);
		safetyNetLogger?.error('Process', 'unhandledRejection', { reason: message });
		// eslint-disable-next-line no-console
		console.error('[unhandledRejection]', message);
	});

	process.on('exit', (code) => {
		const stack = new Error('exit trace').stack;
		writeCrashLine(`[process.exit] code=${code}\n${stack}`);
		safetyNetLogger?.warn('Process', `process.exit(${code})`, { stack });
		// eslint-disable-next-line no-console
		console.error(`[process.exit] code=${code}`, stack);
	});

	// beforeExit only fires when the event loop is empty — not on app.quit/SIGKILL,
	// but helpful to distinguish "nothing left to do" from "killed".
	process.on('beforeExit', (code) => {
		writeCrashLine(`[beforeExit] code=${code}`);
	});

	for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGQUIT'] as const) {
		process.on(signal, () => {
			writeCrashLine(`[signal] ${signal}`);
			safetyNetLogger?.warn('Process', `Received ${signal}`);
			// eslint-disable-next-line no-console
			console.error(`[signal] ${signal}`);
		});
	}

	app.on('before-quit', () => {
		const stack = new Error('before-quit trace').stack;
		writeCrashLine(`[app:before-quit] ${stack}`);
	});
	app.on('will-quit', () => writeCrashLine('[app:will-quit]'));
	app.on('quit', (_e, code) => writeCrashLine(`[app:quit] code=${code}`));
	app.on('render-process-gone', (_e, _wc, details) => {
		writeCrashLine(`[render-process-gone] reason=${details.reason} exitCode=${details.exitCode}`);
	});
	app.on('child-process-gone', (_e, details) => {
		writeCrashLine(
			`[child-process-gone] type=${details.type} reason=${details.reason} exitCode=${details.exitCode}`
		);
	});
}

export function setupAppLifecycle(appState: AppState, logger?: LoggerService): void {
	app.on('before-quit', () => {
		appState.setQuitting();
		logger?.info('App', 'Application is quitting');
	});

	app.on('window-all-closed', () => {
		writeCrashLine(
			`[window-all-closed] platform=${process.platform} isQuitting=${appState.isQuitting}`
		);
		logger?.info('App', 'All windows closed');
		if (process.platform !== 'darwin' && appState.isQuitting) {
			app.quit();
		}
	});

	app.on('activate', () => {
		logger?.debug('App', 'Application activated');
	});

	app.on('will-quit', () => {
		logger?.info('App', 'Application will quit');
	});

	app.on('quit', (_event, exitCode) => {
		logger?.info('App', `Application quit with exit code: ${exitCode}`);
	});
}

/**
 * Setup Electron event logging hooks.
 * Captures various Electron lifecycle and window events for debugging.
 */
export function setupEventLogging(logger: LoggerService): void {
	// App lifecycle events
	app.on('ready', () => {
		logger.info('App', 'Application ready', {
			version: app.getVersion(),
			platform: process.platform,
			arch: process.arch,
			electron: process.versions.electron,
			chrome: process.versions.chrome,
			node: process.versions.node,
		});
	});

	app.on('browser-window-created', (_event, window) => {
		logger.debug('App', `Browser window created: ID ${window.id}`);

		// Window-specific events
		window.on('ready-to-show', () => {
			logger.debug('Window', `Window ready to show: ID ${window.id}`);
		});

		window.on('show', () => {
			logger.debug('Window', `Window shown: ID ${window.id}`);
		});

		window.on('hide', () => {
			logger.debug('Window', `Window hidden: ID ${window.id}`);
		});

		window.on('focus', () => {
			logger.debug('Window', `Window focused: ID ${window.id}`);
		});

		window.on('blur', () => {
			logger.debug('Window', `Window blurred: ID ${window.id}`);
		});

		window.on('maximize', () => {
			logger.debug('Window', `Window maximized: ID ${window.id}`);
		});

		window.on('unmaximize', () => {
			logger.debug('Window', `Window unmaximized: ID ${window.id}`);
		});

		window.on('minimize', () => {
			logger.debug('Window', `Window minimized: ID ${window.id}`);
		});

		window.on('restore', () => {
			logger.debug('Window', `Window restored: ID ${window.id}`);
		});

		window.on('close', () => {
			logger.debug('Window', `Window closing: ID ${window.id}`);
		});

		window.on('closed', () => {
			logger.debug('Window', `Window closed: ID ${window.id}`);
		});

		window.webContents.on('did-finish-load', () => {
			logger.debug('WebContents', `Page loaded: Window ID ${window.id}`);
		});

		window.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
			logger.error('WebContents', `Page failed to load: ${validatedURL}`, {
				windowId: window.id,
				errorCode,
				errorDescription,
			});
		});

		window.webContents.on('render-process-gone', (_event, details) => {
			logger.error('WebContents', `Renderer process gone: Window ID ${window.id}`, {
				reason: details.reason,
				exitCode: details.exitCode,
			});
		});

		window.webContents.on('unresponsive', () => {
			logger.warn('WebContents', `Renderer process unresponsive: Window ID ${window.id}`);
		});

		window.webContents.on('responsive', () => {
			logger.info('WebContents', `Renderer process responsive again: Window ID ${window.id}`);
		});
	});

	app.on('browser-window-focus', (_event, window) => {
		logger.debug('App', `Browser window focused: ID ${window.id}`);
	});

	app.on('browser-window-blur', (_event, window) => {
		logger.debug('App', `Browser window blurred: ID ${window.id}`);
	});

	app.on('child-process-gone', (_event, details) => {
		logger.error('App', 'Child process gone', {
			type: details.type,
			reason: details.reason,
			exitCode: details.exitCode,
		});
	});

	// Certificate errors
	app.on('certificate-error', (_event, _webContents, url, error, certificate) => {
		logger.error('App', 'Certificate error', {
			url,
			error,
			issuer: certificate.issuerName,
		});
	});

	// Session events
	app.on('web-contents-created', (_event, webContents) => {
		logger.debug('App', `WebContents created: ID ${webContents.id}`);
	});

	// Accessibility support
	app.on('accessibility-support-changed', (_event, accessibilitySupportEnabled) => {
		logger.info(
			'App',
			`Accessibility support: ${accessibilitySupportEnabled ? 'enabled' : 'disabled'}`
		);
	});
}

/**
 * Cleanup handler to be called on app quit.
 * Ensures all services are properly disposed.
 */
export async function cleanup(container: MainServiceContainer): Promise<void> {
	const logger = container.get('logger');
	logger.info('Bootstrap', 'Starting cleanup');
	await container.shutdown();
	logger.info('Bootstrap', 'Cleanup complete');
}
