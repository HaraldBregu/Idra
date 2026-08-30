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

interface StoredTaskRecord {
	owner: string;
	task: Task;
}

export class PersistentTaskStore implements TaskStore {
	constructor(private readonly directory: string) {
		this.secureDirectory();
		this.maintain(true);
	}

	async save(task: Task, context: ServerCallContext): Promise<void> {
		if (!task.id) throw new RequestMalformedError('Task ID must not be empty.');
		this.maintain(false);
		const owner = this.owner(context);
		const existing = this.read(this.filePath(task.id));
		if (existing && existing.owner !== owner) {
			throw new RequestMalformedError('Task ID is already owned by another client.');
		}
		this.write({ owner, task });
	}

	async load(taskId: string, context: ServerCallContext): Promise<Task | undefined> {
		this.maintain(false);
		const record = this.read(this.filePath(taskId));
		return record?.owner === this.owner(context) && record.task.id === taskId
			? structuredClone(record.task)
			: undefined;
	}

	async list(params: ListTasksRequest, context: ServerCallContext): Promise<ListTasksResponse> {
		this.maintain(false);
		if ((params.pageSize ?? DEFAULT_PAGE_SIZE) > 100) {
			throw new RequestMalformedError('pageSize must not exceed 100.');
		}
		if ((params.historyLength ?? 0) > 100) {
			throw new RequestMalformedError('historyLength must not exceed 100.');
		}
		let tasks = this.readAll()
			.filter((record) => record.owner === this.owner(context))
			.map((record) => record.task);

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
			const timestamp = (right.status?.timestamp ?? '').localeCompare(left.status?.timestamp ?? '');
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
				copy.history = params.historyLength === 0 ? [] : copy.history.slice(-params.historyLength);
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
			const record = this.read(filePath);
			if (!record) continue;
			const { task } = record;
			if (recover && !TERMINAL_STATES.has(task.status?.state ?? TaskState.TASK_STATE_UNSPECIFIED)) {
				this.write({
					owner: record.owner,
					task: {
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

	private readAll(): StoredTaskRecord[] {
		return this.files().flatMap((filePath) => {
			const task = this.read(filePath);
			return task ? [task] : [];
		});
	}

	private read(filePath: string): StoredTaskRecord | undefined {
		try {
			const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
			if (
				parsed &&
				typeof parsed === 'object' &&
				!Array.isArray(parsed) &&
				typeof (parsed as Partial<StoredTaskRecord>).owner === 'string' &&
				(parsed as Partial<StoredTaskRecord>).task
			) {
				const task = A2aTask.fromJSON((parsed as Partial<StoredTaskRecord>).task);
				return task.id
					? { owner: (parsed as StoredTaskRecord).owner, task }
					: undefined;
			}
			const task = A2aTask.fromJSON(parsed);
			return task.id ? { owner: 'legacy-shared-token', task } : undefined;
		} catch {
			return undefined;
		}
	}

	private write(record: StoredTaskRecord): void {
		const filePath = this.filePath(record.task.id);
		const temporaryPath = path.join(
			this.directory,
			`.${path.basename(filePath)}.${randomUUID()}.tmp`
		);
		try {
			fs.writeFileSync(
				temporaryPath,
				`${JSON.stringify({ owner: record.owner, task: A2aTask.toJSON(record.task) }, null, 2)}\n`,
				{
				encoding: 'utf8',
				flag: 'wx',
				mode: 0o600,
				}
			);
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

	private owner(context: ServerCallContext): string {
		return context.user?.isAuthenticated && context.user.userName
			? context.user.userName
			: 'anonymous';
	}
}

export async function createTaskStore(tasksDirectory: string): Promise<PersistentTaskStore> {
	return new PersistentTaskStore(tasksDirectory);
}
