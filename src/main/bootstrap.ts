/**
 * Bootstrap module demonstrating the new architecture.
 *
 * This file shows how to initialize the core infrastructure and IPC modules.
 * It can be gradually integrated into index.ts to replace the old architecture.
 *
 * Usage (in index.ts):
 *   import { bootstrapServices, bootstrapIpcModules } from './bootstrap'
 *   const { container, eventBus, windowFactory, appState } = await bootstrapServices()
 *   bootstrapIpcModules(container, eventBus)
 */

import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

// Core infrastructure
import { ServiceContainer, EventBus, WindowFactory, AppState, WindowContextManager } from './core';

// Services
import { StoreService } from './store';
import { LoggerService } from './logger';
import { ThemeService } from './theme';
import { CronService } from './cron';
import { TaskHandlerRegistry } from './task/task-handler-registry';
import { TaskExecutor } from './task/task-executor';
import { TaskReactionRegistry } from './task/task-reaction-registry';
import { TaskReactionBus } from './task/task-reaction-bus';
import { ServiceResolver } from './shared/service-resolver';
import { ModelResolver } from './shared/model-resolver';
import { AssistantRegistry, DEFAULT_ASSISTANT_ID } from './assistant';
import { ChannelRegistry } from './channels';
import {
	ContentWriterTaskHandler,
	ContentReviewerTaskHandler,
} from './task/handlers';

// IPC modules
import type { IpcModule } from './ipc';
import { AppIpc, AssistantIpc, TaskIpc, WindowIpc } from './ipc';

export interface BootstrapResult {
	container: ServiceContainer;
	eventBus: EventBus;
	windowFactory: WindowFactory;
	appState: AppState;
	logger: LoggerService;
	windowContextManager: WindowContextManager;
}

/**
 * Initialize core infrastructure and register all services.
 * Returns the initialized components for use in the main process.
 */
export function bootstrapServices(): BootstrapResult {
	// Initialize core infrastructure
	const appState = new AppState();
	const container = new ServiceContainer();
	const eventBus = new EventBus();

	// Register core infrastructure
	container.register('appState', appState);
	container.register('eventBus', eventBus);

	// Register services (order matters for dependencies)
	const storeService = container.register('store', new StoreService());

	// Initialize logger with event bus for automatic event logging
	const logger = new LoggerService(eventBus);
	container.register('logger', logger);

	// Theme management service
	container.register('themeService', new ThemeService(logger));

	// Cron job scheduler
	container.register('cronService', new CronService(logger));

	// Create WindowFactory with logger access
	const windowFactory = new WindowFactory(logger);
	container.register('windowFactory', windowFactory);

	// Create WindowContextManager for managing per-window service instances
	const windowContextManager = new WindowContextManager(container, eventBus);
	container.register('windowContextManager', windowContextManager);

	// Task system -- handler registry + executor
	const taskHandlerRegistry = container.register('taskHandlerRegistry', new TaskHandlerRegistry());
	const serviceResolver = new ServiceResolver(storeService);
	const modelResolver = new ModelResolver();
	container.register('serviceResolver', serviceResolver);
	container.register('modelResolver', modelResolver);
	taskHandlerRegistry.register(
		new ContentWriterTaskHandler({
			serviceResolver,
			modelResolver,
			logger,
		})
	);
	taskHandlerRegistry.register(
		new ContentReviewerTaskHandler({
			serviceResolver,
			modelResolver,
			logger,
		})
	);
	container.register('taskExecutor', new TaskExecutor(taskHandlerRegistry, eventBus, 10, logger));

	// Assistant registry -- conversational OpenAI assistants. One default
	// assistant ('main') is registered eagerly so window.app.assistant.send works
	// without any renderer-side init.
	const assistantRegistry = new AssistantRegistry();
	assistantRegistry.create({
		id: DEFAULT_ASSISTANT_ID,
		getApiKey: () => {
			const ref = storeService.getAssistantService().llm;
			const resolved = storeService.resolveProviderRef(ref);
			if (resolved?.provider.apiKey) return resolved.provider.apiKey;
			return storeService.findProvider('openai')?.apiKey;
		},
		getModel: () => {
			const ref = storeService.getAssistantService().llm;
			const resolved = storeService.resolveProviderRef(ref);
			return ref.model || resolved?.model || storeService.findProvider('openai')?.defaultModel || '';
		},
		store: storeService,
		cron: container.get<CronService>('cronService'),
	});
	container.register('assistantRegistry', assistantRegistry);

	// Channel registry -- messaging adapters (Telegram, WhatsApp). Adapters are
	// instantiated lazily from store.channels and started after app is ready.
	container.register(
		'channelRegistry',
		new ChannelRegistry(storeService, logger, eventBus, assistantRegistry)
	);

	// Task reaction layer -- main-process observer that receives TaskExecutor lifecycle
	// AppEvents and fan-outs to registered TaskReactionHandlers by task type.
	const taskReactionRegistry = new TaskReactionRegistry(logger);
	const taskReactionBus = container.register(
		'taskReactionBus',
		new TaskReactionBus(taskReactionRegistry, eventBus, logger)
	);
	taskReactionBus.initialize();

	logger.info('Bootstrap', `Registered ${container.has('store') ? 'all' : 'some'} global services`);

	return { container, eventBus, windowFactory, appState, logger, windowContextManager };
}

/**
 * Register all IPC modules.
 * This should be called after services are registered and before app is ready.
 */
export function bootstrapIpcModules(container: ServiceContainer, eventBus: EventBus): void {
	const logger = container.get('logger') as LoggerService;

	const ipcModules: IpcModule[] = [
		new AppIpc(),
		new AssistantIpc(),
		new TaskIpc(),
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

/**
 * Setup app lifecycle handlers using AppState.
 * Replaces the unsafe (app as { isQuitting?: boolean }).isQuitting pattern.
 */
/**
 * Install process-level handlers to catch silent exits.
 * Logs uncaught exceptions, unhandled rejections, and exit with a stack trace
 * so we can tell a real crash from an intentional quit.
 *
 * Idempotent: call once early with no logger, call again after logger exists
 * to attach it — handlers are only registered on the first call.
 */
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
		writeCrashLine(
			`[render-process-gone] reason=${details.reason} exitCode=${details.exitCode}`
		);
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
export async function cleanup(container: ServiceContainer): Promise<void> {
	const logger = container.get('logger') as LoggerService;
	logger.info('Bootstrap', 'Starting cleanup');
	await container.shutdown();
	logger.info('Bootstrap', 'Cleanup complete');
}
