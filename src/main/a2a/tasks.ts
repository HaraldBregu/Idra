import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
	Role,
	Task as A2aTask,
	TaskState,
	type ListTasksRequest,
	type ListTasksResponse,
	type Task,
} from '@a2a-js/sdk';
import { RequestMalformedError } from '@a2a-js/sdk/errors';
import type { ServerCallContext, TaskStore } from '@a2a-js/sdk/server';

const RETENTION_MS = 30 * 24 * 60 * 60 * 1_000;
const DEFAULT_PAGE_SIZE = 50;
const TERMINAL_STATES = new Set([
	TaskState.TASK_STATE_COMPLETED,
	TaskState.TASK_STATE_FAILED,
	TaskState.TASK_STATE_CANCELED,
	TaskState.TASK_STATE_REJECTED,
]);

interface PageCursor {
	timestamp: string;
	id: string;
}

export class PersistentTaskStore implements TaskStore {
	constructor(private readonly directory: string) {
		this.secureDirectory();
		this.maintain(true);
	}

	async save(task: Task, _context: ServerCallContext): Promise<void> {
		if (!task.id) throw new RequestMalformedError('Task ID must not be empty.');
		this.maintain(false);
		this.write(task);
	}

	async load(taskId: string, _context: ServerCallContext): Promise<Task | undefined> {
		this.maintain(false);
		const task = this.read(this.filePath(taskId));
		return task?.id === taskId ? structuredClone(task) : undefined;
	}

	async list(
		params: ListTasksRequest,
		_context: ServerCallContext
	): Promise<ListTasksResponse> {
		this.maintain(false);
		let tasks = this.readAll();

		if (params.contextId) tasks = tasks.filter((task) => task.contextId === params.contextId);
		if (params.status !== TaskState.TASK_STATE_UNSPECIFIED) {
			tasks = tasks.filter((task) => task.status?.state === params.status);
		}
		if (params.statusTimestampAfter) {
			const threshold = Date.parse(params.statusTimestampAfter);
			tasks = tasks.filter((task) => {
				const timestamp = Date.parse(task.status?.timestamp ?? '');
				return Number.isFinite(timestamp) && timestamp >= threshold;
			});
		}

		tasks.sort((left, right) => {
			const timestamp = (right.status?.timestamp ?? '').localeCompare(
				left.status?.timestamp ?? ''
			);
			return timestamp || right.id.localeCompare(left.id);
		});

		const totalSize = tasks.length;
		if (params.pageToken) {
			const cursor = this.decodeCursor(params.pageToken);
			const cursorIndex = tasks.findIndex(
				(task) => task.id === cursor.id && (task.status?.timestamp ?? '') === cursor.timestamp
			);
			tasks = cursorIndex === -1 ? [] : tasks.slice(cursorIndex + 1);
		}

		const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
		const page = tasks.slice(0, pageSize);
		const result = page.map((task) => {
			const copy = structuredClone(task);
			if (!params.includeArtifacts) copy.artifacts = [];
			if (params.historyLength !== undefined) {
				copy.history =
					params.historyLength === 0 ? [] : copy.history.slice(-params.historyLength);
			}
			return copy;
		});
		const last = page.at(-1);
		const nextPageToken =
			last && tasks.length > page.length
				? this.encodeCursor({ timestamp: last.status?.timestamp ?? '', id: last.id })
				: '';

		return { tasks: result, nextPageToken, pageSize, totalSize };
	}

	private secureDirectory(): void {
		fs.mkdirSync(this.directory, { recursive: true, mode: 0o700 });
		fs.chmodSync(this.directory, 0o700);
	}

	private maintain(recover: boolean): void {
		this.secureDirectory();
		const cutoff = Date.now() - RETENTION_MS;
		for (const filePath of this.files()) {
			const task = this.read(filePath);
			if (!task) continue;
			if (recover && !TERMINAL_STATES.has(task.status?.state ?? TaskState.TASK_STATE_UNSPECIFIED)) {
				this.write({
					...task,
					status: {
						state: TaskState.TASK_STATE_FAILED,
						timestamp: new Date().toISOString(),
						message: {
							messageId: randomUUID(),
							contextId: task.contextId,
							taskId: task.id,
							role: Role.ROLE_AGENT,
							parts: [
								{
									content: { $case: 'text', value: 'Task failed because the server restarted.' },
									metadata: undefined,
									filename: '',
									mediaType: 'text/plain',
								},
							],
							metadata: undefined,
							extensions: [],
							referenceTaskIds: [],
						},
					},
				});
				continue;
			}

			if (!TERMINAL_STATES.has(task.status?.state ?? TaskState.TASK_STATE_UNSPECIFIED)) continue;
			const statusTime = Date.parse(task.status?.timestamp ?? '');
			const modifiedTime = fs.statSync(filePath).mtimeMs;
			if ((Number.isFinite(statusTime) ? statusTime : modifiedTime) < cutoff) {
				fs.rmSync(filePath);
			}
		}
	}

	private files(): string[] {
		return fs
			.readdirSync(this.directory, { withFileTypes: true })
			.filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
			.map((entry) => path.join(this.directory, entry.name));
	}

	private readAll(): Task[] {
		return this.files().flatMap((filePath) => {
			const task = this.read(filePath);
			return task ? [task] : [];
		});
	}

	private read(filePath: string): Task | undefined {
		try {
			const parsed = A2aTask.fromJSON(JSON.parse(fs.readFileSync(filePath, 'utf8')));
			return parsed.id ? parsed : undefined;
		} catch {
			return undefined;
		}
	}

	private write(task: Task): void {
		const filePath = this.filePath(task.id);
		const temporaryPath = path.join(
			this.directory,
			`.${path.basename(filePath)}.${randomUUID()}.tmp`
		);
		try {
			fs.writeFileSync(temporaryPath, `${JSON.stringify(A2aTask.toJSON(task), null, 2)}\n`, {
				encoding: 'utf8',
				flag: 'wx',
				mode: 0o600,
			});
			fs.renameSync(temporaryPath, filePath);
		} finally {
			fs.rmSync(temporaryPath, { force: true });
		}
	}

	private filePath(taskId: string): string {
		return path.join(this.directory, `${Buffer.from(taskId).toString('base64url')}.json`);
	}

	private encodeCursor(cursor: PageCursor): string {
		return Buffer.from(JSON.stringify(cursor)).toString('base64url');
	}

	private decodeCursor(token: string): PageCursor {
		try {
			const value = JSON.parse(Buffer.from(token, 'base64url').toString('utf8')) as unknown;
			if (
				typeof value !== 'object' ||
				value === null ||
				typeof (value as Partial<PageCursor>).timestamp !== 'string' ||
				typeof (value as Partial<PageCursor>).id !== 'string'
			) {
				throw new Error('Invalid cursor.');
			}
			return value as PageCursor;
		} catch (error) {
			throw new RequestMalformedError({ message: 'Invalid page token.', cause: error });
		}
	}
}
