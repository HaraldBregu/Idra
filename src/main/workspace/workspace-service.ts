import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { app } from 'electron';
import type { StoreService } from '../store';
import type { EventBus } from '../core/event-bus';
import type { Disposable } from '../core/service-container';
import type { LoggerService } from '../logger';
import { WORKSPACE_VALIDATION_INTERVAL_MS } from '../constants';

const APP_FOLDER = 'Friday';
const WORKSPACES_FOLDER = 'workspaces';

/**
 * Snapshot of the current workspace state.
 * Returned by getState() for a consistent, read-only view.
 */
export interface WorkspaceState {
	/** Absolute path to the current project directory, or null if none is set. */
	currentPath: string | null;
	/** Timestamp (ms) when the current workspace was set. 0 if no workspace. */
	openedAt: number;
}

/**
 * WorkspaceService manages the current project directory for the application.
 *
 * Responsibilities:
 *   - Hold the current workspace path in memory (starts as null)
 *   - Validate that the path exists and is a directory before accepting it
 *   - Persist the workspace path and recent history via StoreService
 *   - Emit 'workspace:changed' on the EventBus so other services can react
 *   - Optionally hydrate from the persisted store on initialization
 *
 * This service is registered once in the ServiceContainer and accessed by key.
 * It does NOT use the Singleton pattern -- the container enforces single-instance.
 */
export class WorkspaceService implements Disposable {
	private currentPath: string | null = null;
	private openedAt: number = 0;
	private validationTimer: ReturnType<typeof setInterval> | null = null;

	/** How often (ms) to check if the workspace folder still exists. */
	private static readonly VALIDATION_INTERVAL_MS = WORKSPACE_VALIDATION_INTERVAL_MS;

	constructor(
		private readonly store: StoreService,
		private readonly eventBus: EventBus,
		private readonly logger?: LoggerService
	) {}

	/**
	 * Initialize the service by hydrating from the persisted store.
	 * Call this after construction, once the app is ready.
	 *
	 * If the previously persisted workspace path still exists on disk,
	 * it is restored as the current workspace (without re-emitting events).
	 * If the path no longer exists, it is silently discarded.
	 */
	initialize(): void {
		const persisted = this.store.getCurrentWorkspace();
		if (persisted && this.isValidDirectory(persisted)) {
			this.currentPath = persisted;
			this.openedAt = Date.now();
			this.startValidationTimer();
			this.logger?.info('WorkspaceService', `Restored workspace from store: ${persisted}`);
		} else if (persisted) {
			this.logger?.info(
				'WorkspaceService',
				`Persisted workspace no longer exists, clearing: ${persisted}`
			);
			this.store.clearCurrentWorkspace();
		} else {
			this.logger?.info('WorkspaceService', 'No persisted workspace, starting with null');
		}
	}

	/**
	 * Get the current workspace directory path.
	 * Returns null if no workspace is set.
	 */
	getCurrent(): string | null {
		return this.currentPath;
	}

	/**
	 * Get a snapshot of the full workspace state.
	 */
	getState(): WorkspaceState {
		return {
			currentPath: this.currentPath,
			openedAt: this.openedAt,
		};
	}

	/**
	 * Set the current workspace directory.
	 *
	 * Validates that the path:
	 *   1. Is a non-empty string
	 *   2. Is an absolute path
	 *   3. Exists on disk
	 *   4. Is a directory (not a file)
	 *
	 * On success: updates in-memory state, persists to store, emits event.
	 * On failure: throws a descriptive Error.
	 */
	setCurrent(directoryPath: string): void {
		// Normalize the path to resolve .. and trailing slashes
		const normalized = path.resolve(directoryPath);

		this.validatePath(normalized);

		const previousPath = this.currentPath;
		this.currentPath = normalized;
		this.openedAt = Date.now();

		// Persist to store (adds to recent workspaces automatically)
		this.store.setCurrentWorkspace(normalized);

		this.logger?.info('WorkspaceService', `Workspace changed: ${previousPath} -> ${normalized}`);

		// Start periodic validation for the new workspace
		this.startValidationTimer();

		// Notify other services via EventBus (main-process listeners)
		this.eventBus.emit('workspace:changed', {
			currentPath: normalized,
			previousPath,
		});

		// Broadcast to all renderer windows
		this.eventBus.broadcast('workspace:changed', {
			currentPath: normalized,
			previousPath,
		});
	}

	/**
	 * Clear the current workspace. Resets to the initial null state.
	 */
	clear(): void {
		const previousPath = this.currentPath;
		this.currentPath = null;
		this.openedAt = 0;

		this.stopValidationTimer();
		this.store.clearCurrentWorkspace();

		this.logger?.info('WorkspaceService', `Workspace cleared, was: ${previousPath}`);

		this.eventBus.emit('workspace:changed', {
			currentPath: null,
			previousPath,
		});

		// Broadcast to all renderer windows
		this.eventBus.broadcast('workspace:changed', {
			currentPath: null,
			previousPath,
		});
	}

	/**
	 * Resolve the managed workspaces root: `{home}/Friday/workspaces/`.
	 * Created on first access if missing.
	 */
	getWorkspacesRoot(): string {
		const root = path.join(app.getPath('home'), APP_FOLDER, WORKSPACES_FOLDER);
		if (!fs.existsSync(root)) {
			fs.mkdirSync(root, { recursive: true });
		}
		return root;
	}

	/**
	 * Enumerate every workspace folder under the managed root.
	 * Each entry is keyed by folder name (the workspace ID) and enriched with
	 * the last-opened timestamp from the persistent store (0 if never opened).
	 */
	listWorkspaceFolders(): Array<{ id: string; path: string; lastOpened: number }> {
		const root = this.getWorkspacesRoot();
		const lastOpenedByPath = new Map(
			this.store.getRecentWorkspaces().map((w) => [w.path, w.lastOpened])
		);

		const entries = fs.readdirSync(root, { withFileTypes: true });
		return entries
			.filter((e) => e.isDirectory())
			.map((e) => {
				const workspacePath = path.join(root, e.name);
				return {
					id: e.name,
					path: workspacePath,
					lastOpened: lastOpenedByPath.get(workspacePath) ?? 0,
				};
			});
	}

	/**
	 * Create an empty workspace folder under the managed root with a fresh UUID.
	 * Caller is responsible for writing the workspace.json `project` block afterwards.
	 */
	createWorkspaceFolder(): { id: string; path: string } {
		const root = this.getWorkspacesRoot();
		const id = randomUUID();
		const workspacePath = path.join(root, id);
		fs.mkdirSync(workspacePath, { recursive: true });
		this.logger?.info('WorkspaceService', `Created workspace folder: ${workspacePath}`);
		return { id, path: workspacePath };
	}

	/**
	 * Check whether a workspace is currently set.
	 */
	hasWorkspace(): boolean {
		return this.currentPath !== null;
	}

	/**
	 * Cleanup on shutdown.
	 */
	destroy(): void {
		this.stopValidationTimer();
		this.logger?.info('WorkspaceService', 'Destroyed');
	}

	// ---------------------------------------------------------------------------
	// Private helpers
	// ---------------------------------------------------------------------------

	/**
	 * Validate that a path is suitable as a workspace directory.
	 * Throws a descriptive error if validation fails.
	 */
	private validatePath(absolutePath: string): void {
		if (!absolutePath || typeof absolutePath !== 'string') {
			throw new Error('Workspace path must be a non-empty string');
		}

		if (!path.isAbsolute(absolutePath)) {
			throw new Error(`Workspace path must be absolute, got: ${absolutePath}`);
		}

		if (!fs.existsSync(absolutePath)) {
			throw new Error(`Workspace path does not exist: ${absolutePath}`);
		}

		const stat = fs.statSync(absolutePath);
		if (!stat.isDirectory()) {
			throw new Error(`Workspace path is not a directory: ${absolutePath}`);
		}
	}

	/**
	 * Quick check if a path is a valid, existing directory.
	 * Returns false instead of throwing -- used during hydration.
	 */
	private isValidDirectory(dirPath: string): boolean {
		try {
			const stat = fs.statSync(dirPath);
			return stat.isDirectory();
		} catch {
			return false;
		}
	}

	// ---------------------------------------------------------------------------
	// Workspace folder validation (deletion detection)
	// ---------------------------------------------------------------------------

	/**
	 * Start a periodic timer that checks whether the current workspace folder
	 * still exists on disk. If the folder is found to be missing the workspace
	 * is automatically cleared and a `workspace:deleted` event is emitted so
	 * the renderer can redirect the user.
	 */
	private startValidationTimer(): void {
		this.stopValidationTimer();

		this.validationTimer = setInterval(() => {
			if (!this.currentPath) {
				this.stopValidationTimer();
				return;
			}

			if (!this.isValidDirectory(this.currentPath)) {
				this.logger?.warn(
					'WorkspaceService',
					`Workspace folder no longer exists: ${this.currentPath}`
				);
				this.handleWorkspaceGone(this.currentPath);
			}
		}, WorkspaceService.VALIDATION_INTERVAL_MS);
	}

	/**
	 * Stop the periodic validation timer.
	 */
	private stopValidationTimer(): void {
		if (this.validationTimer) {
			clearInterval(this.validationTimer);
			this.validationTimer = null;
		}
	}

	/**
	 * Called when the workspace folder is detected as missing.
	 * Clears the workspace and notifies both the main-process services
	 * and all renderer windows.
	 */
	private handleWorkspaceGone(deletedPath: string): void {
		// Determine reason: if parent directory exists but the folder does not
		// it was likely deleted or renamed. Otherwise treat as inaccessible.
		let reason: 'deleted' | 'inaccessible' | 'renamed' = 'deleted';
		try {
			const parentDir = path.dirname(deletedPath);
			if (!fs.existsSync(parentDir)) {
				reason = 'inaccessible';
			}
		} catch {
			reason = 'inaccessible';
		}

		// Clear workspace state (this also stops the timer via clear())
		this.clear();

		const deletedEvent = {
			deletedPath,
			reason,
			timestamp: Date.now(),
		};

		// Emit typed main-process event
		this.eventBus.emit('workspace:deleted', deletedEvent);

		// Broadcast to all renderer windows
		this.eventBus.broadcast('workspace:deleted', deletedEvent);

		this.logger?.info(
			'WorkspaceService',
			`Workspace gone event broadcast: ${deletedPath} (${reason})`
		);
	}
}
