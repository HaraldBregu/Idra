import type { EventBus } from '../../event_bus';

/**
 * Interface for self-contained IPC handler modules.
 * Each module registers its own ipcMain.handle/on calls
 * and receives the concrete services it needs plus the event bus.
 */
export interface IpcModule<TDeps = unknown> {
	/**
	 * Unique name for this IPC module (used for logging).
	 */
	readonly name: string;

	/**
	 * Register all IPC handlers for this domain.
	 * Called once during app initialization.
	 */
	register(deps: TDeps, eventBus: EventBus): void;
}
