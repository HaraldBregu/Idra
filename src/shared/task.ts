export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = Record<string, JsonValue>;

export type TaskId = string;
export type WorkflowId = string;
export type TaskType = string;

export type TaskStatus =
	| 'pending'
	| 'queued'
	| 'scheduled'
	| 'running'
	| 'waitingForDependency'
	| 'waitingForConfirmation'
	| 'paused'
	| 'retrying'
	| 'completed'
	| 'failed'
	| 'cancelled'
	| 'timedOut'
	| 'skipped';

export type TaskPriority = 'low' | 'normal' | 'high' | 'critical';

export type TaskSource =
	| 'agent'
	| 'skill'
	| 'tool'
	| 'connector'
	| 'cron'
	| 'api'
	| 'ui'
	| 'system'
	| 'migration'
	| 'sync';

export type TaskVisibility = 'private' | 'user' | 'workspace' | 'system';

export type TaskPermissionLevel =
	| 'readPrivateData'
	| 'writePrivateData'
	| 'writeExternal'
	| 'deleteData'
	| 'runCode'
	| 'accessNetwork'
	| 'accessFileSystem'
	| 'accessConnector'
	| 'manageTasks'
	| 'admin';

export type TaskCancellationMode = 'cooperative' | 'immediate' | 'disabled';

export interface TaskRetryPolicy {
	maxAttempts: number;
	initialDelayMs: number;
	maxDelayMs: number;
	backoffMultiplier: number;
	jitter: boolean;
	retryableErrorCodes: string[];
	nonRetryableErrorCodes: string[];
}

export interface TaskSchedulePolicy {
	runAt?: string;
	intervalMs?: number;
	cronExpression?: string;
	timezone?: string;
	repeat?: boolean;
	maxRuns?: number;
	endAt?: string;
	skipIfRunning?: boolean;
	catchUpMissedRuns?: boolean;
	maxCatchUpRuns?: number;
}

export type TaskDependencyType =
	| 'completesBefore'
	| 'succeedsBefore'
	| 'failsBefore'
	| 'producesOutputFor'
	| 'blocksUntil';

export interface TaskDependency {
	taskId: TaskId;
	type: TaskDependencyType;
	onFailure?: 'fail' | 'skip' | 'ignore';
}

export interface TaskProgress {
	percentage?: number;
	currentStep?: string;
	totalSteps?: number;
	completedSteps?: number;
	message?: string;
	subtasks?: Record<TaskId, number>;
	estimatedRemainingMs?: number;
	indeterminate?: boolean;
	updatedAt: string;
}

export interface TaskError {
	code: string;
	message: string;
	retryable: boolean;
	safeUserMessage: string;
	metadata?: JsonObject;
	stack?: string;
}

export interface TaskResult<TOutput = unknown> {
	status: 'success' | 'failure';
	output?: TOutput;
	error?: TaskError;
	artifacts?: TaskArtifactReference[];
	metadata?: JsonObject;
}

export interface TaskArtifactReference {
	id: string;
	kind: 'file' | 'blob' | 'url' | 'store';
	uri: string;
	mimeType?: string;
	sizeBytes?: number;
	expiresAt?: string;
	privacyLevel: TaskVisibility;
}

export interface TaskAttempt {
	id: string;
	taskId: TaskId;
	attemptNumber: number;
	status: 'running' | 'completed' | 'failed' | 'cancelled' | 'timedOut';
	startedAt: string;
	finishedAt?: string;
	durationMs?: number;
	workerId?: string;
	error?: TaskError;
	metadata: JsonObject;
}

export type TaskEventType =
	| 'task.created'
	| 'task.queued'
	| 'task.started'
	| 'task.progress'
	| 'task.log'
	| 'task.completed'
	| 'task.failed'
	| 'task.cancelled'
	| 'task.retrying'
	| 'task.timedOut'
	| 'task.paused'
	| 'task.resumed'
	| 'task.dependencyWaiting'
	| 'task.confirmationRequired'
	| 'workflow.started'
	| 'workflow.progress'
	| 'workflow.completed'
	| 'workflow.failed'
	| 'workflow.cancelled';

export interface TaskEvent {
	id: string;
	taskId?: TaskId;
	workflowId?: WorkflowId;
	type: TaskEventType;
	message?: string;
	progress?: TaskProgress;
	log?: TaskLogEntry;
	error?: TaskError;
	createdAt: string;
	metadata: JsonObject;
}

export interface TaskLogEntry {
	id: string;
	taskId: TaskId;
	level: 'debug' | 'info' | 'warn' | 'error';
	message: string;
	createdAt: string;
	metadata: JsonObject;
}

export interface TaskAuditLogEntry {
	id: string;
	taskId: TaskId;
	action: string;
	actor: TaskSource | 'task-manager';
	message: string;
	createdAt: string;
	metadata: JsonObject;
}

export interface Task<TInput = unknown, TOutput = unknown> {
	id: TaskId;
	type: TaskType;
	title: string;
	description?: string;
	source: TaskSource;
	sourceId?: string;
	parentTaskId?: TaskId;
	childTaskIds: TaskId[];
	workflowId?: WorkflowId;
	userId?: string;
	sessionId?: string;
	input: TInput;
	output?: TOutput;
	error?: TaskError;
	status: TaskStatus;
	priority: TaskPriority;
	visibility: TaskVisibility;
	tags: string[];
	progress: TaskProgress;
	dependencies: TaskDependency[];
	retryPolicy: TaskRetryPolicy;
	schedulePolicy?: TaskSchedulePolicy;
	timeoutMs?: number;
	cancellationMode: TaskCancellationMode;
	createdAt: string;
	updatedAt: string;
	queuedAt?: string;
	startedAt?: string;
	completedAt?: string;
	failedAt?: string;
	cancelledAt?: string;
	nextRunAt?: string;
	lockedBy?: string;
	lockExpiresAt?: string;
	attemptCount: number;
	maxAttempts: number;
	metadata: JsonObject;
	audit: TaskAuditLogEntry[];
}

export interface Workflow {
	workflowId: WorkflowId;
	title: string;
	description?: string;
	rootTaskId?: TaskId;
	taskIds: TaskId[];
	status: TaskStatus;
	progress: TaskProgress;
	createdAt: string;
	updatedAt: string;
	completedAt?: string;
	failedAt?: string;
	cancelledAt?: string;
	metadata: JsonObject;
	audit: TaskAuditLogEntry[];
}

export interface TaskConfirmation {
	confirmationId: string;
	taskId: TaskId;
	userId?: string;
	actionSummary: string;
	risks: string[];
	dataToBeSentSummary?: string;
	expiresAt: string;
	createdAt: string;
}

export interface TaskSchema {
	type: 'object' | 'string' | 'number' | 'boolean' | 'array' | 'null';
	properties?: Record<string, TaskSchema>;
	required?: string[];
	items?: TaskSchema;
	enum?: JsonValue[];
	additionalProperties?: boolean;
	description?: string;
}

export interface TaskExecutionResult<TOutput = unknown> extends TaskResult<TOutput> {}

export interface TaskExecutionContext {
	taskId: TaskId;
	userId?: string;
	sessionId?: string;
	parentTaskId?: TaskId;
	attemptNumber: number;
	signal: AbortSignal;
	updateProgress(progress: Partial<Omit<TaskProgress, 'updatedAt'>>): Promise<void>;
	emitEvent(event: Omit<TaskEvent, 'id' | 'taskId' | 'createdAt' | 'metadata'> & { metadata?: JsonObject }): Promise<void>;
	log(entry: Omit<TaskLogEntry, 'id' | 'taskId' | 'createdAt'>): Promise<void>;
	spawnChildTask(request: TaskCreateRequest): Promise<Task>;
	getTask(taskId: TaskId): Promise<Task>;
	getDependencyResult<TOutput = unknown>(taskId: TaskId): Promise<TaskResult<TOutput> | undefined>;
	checkPermission(permission: TaskPermissionLevel): boolean;
	getScopedServices<TServices = unknown>(): TServices;
	metadata: JsonObject;
}

export interface TaskExecutor<TInput = unknown, TOutput = unknown> {
	execute(input: TInput, context: TaskExecutionContext): Promise<TaskExecutionResult<TOutput>>;
}

export interface TaskDefinition<TInput = unknown, TOutput = unknown> {
	taskType: TaskType;
	displayName: string;
	description: string;
	inputSchema: TaskSchema;
	outputSchema: TaskSchema;
	defaultPriority: TaskPriority;
	defaultTimeoutMs?: number;
	defaultRetryPolicy: TaskRetryPolicy;
	requiredPermissions: TaskPermissionLevel[];
	supportsCancellation: boolean;
	supportsPause: boolean;
	supportsResume: boolean;
	supportsProgress: boolean;
	supportsRecovery: boolean;
	requiresConfirmation?: boolean;
	defaultCancellationMode?: TaskCancellationMode;
	executor: TaskExecutor<TInput, TOutput>;
	metadata?: JsonObject;
}

export interface TaskCreateRequest<TInput = unknown> {
	type: TaskType;
	title?: string;
	description?: string;
	source: TaskSource;
	sourceId?: string;
	parentTaskId?: TaskId;
	workflowId?: WorkflowId;
	userId?: string;
	sessionId?: string;
	input: TInput;
	priority?: TaskPriority;
	visibility?: TaskVisibility;
	tags?: string[];
	dependencies?: TaskDependency[];
	retryPolicy?: Partial<TaskRetryPolicy>;
	schedulePolicy?: TaskSchedulePolicy;
	timeoutMs?: number;
	cancellationMode?: TaskCancellationMode;
	metadata?: JsonObject;
	availablePermissions?: TaskPermissionLevel[];
	autoStart?: boolean;
}

export interface WorkflowCreateRequest {
	title: string;
	description?: string;
	rootTaskId?: TaskId;
	taskIds?: TaskId[];
	metadata?: JsonObject;
}

export interface TaskListFilter {
	status?: TaskStatus | TaskStatus[];
	source?: TaskSource | TaskSource[];
	type?: TaskType | TaskType[];
	userId?: string;
	sessionId?: string;
	workflowId?: WorkflowId;
	parentTaskId?: TaskId;
	visibility?: TaskVisibility | TaskVisibility[];
	tag?: string;
	includeTerminal?: boolean;
	limit?: number;
}

export interface WorkflowListFilter {
	status?: TaskStatus | TaskStatus[];
	limit?: number;
}

export interface TaskCleanupPolicy {
	olderThanMs: number;
	statuses?: TaskStatus[];
	maxTasksToDelete?: number;
}

export interface TaskQueueStats {
	queued: number;
	running: number;
	scheduled: number;
	paused: boolean;
	concurrency: number;
	deadLettered: number;
}

export interface TaskStore {
	createTask(task: Task): Promise<void>;
	updateTask(taskId: TaskId, patch: Partial<Task>): Promise<void>;
	getTask(taskId: TaskId): Promise<Task>;
	listTasks(filter?: TaskListFilter): Promise<Task[]>;
	deleteTask(taskId: TaskId): Promise<void>;
	appendEvent(event: TaskEvent): Promise<void>;
	getEvents(taskId: TaskId): Promise<TaskEvent[]>;
	createAttempt(attempt: TaskAttempt): Promise<void>;
	updateAttempt(attemptId: string, patch: Partial<TaskAttempt>): Promise<void>;
	acquireLock(taskId: TaskId, workerId: string, ttlMs: number): Promise<boolean>;
	releaseLock(taskId: TaskId, workerId: string): Promise<void>;
	listRecoverableTasks(): Promise<Task[]>;
	createWorkflow(workflow: Workflow): Promise<void>;
	updateWorkflow(workflowId: WorkflowId, patch: Partial<Workflow>): Promise<void>;
	getWorkflow(workflowId: WorkflowId): Promise<Workflow>;
	listWorkflows(filter?: WorkflowListFilter): Promise<Workflow[]>;
}

export interface TaskQueue {
	enqueue(task: Task): Promise<void>;
	dequeue(): Promise<Task | undefined>;
	start(): void;
	stop(): Promise<void>;
	drain(): Promise<void>;
	size(): number;
	pause(): void;
	resume(): void;
	setConcurrency(limit: number): void;
	getStats(): TaskQueueStats;
}

export interface TaskWorker {
	workerId: string;
	run(task: Task, definition: TaskDefinition, context: TaskExecutionContext): Promise<TaskResult>;
	shutdown(): Promise<void>;
}

export type TaskSubscription = () => void;

export interface TaskManager {
	createTask(request: TaskCreateRequest): Promise<Task>;
	enqueueTask(taskId: TaskId): Promise<void>;
	runTask(taskId: TaskId): Promise<TaskResult>;
	scheduleTask(request: TaskCreateRequest): Promise<Task>;
	cancelTask(taskId: TaskId, reason?: string): Promise<void>;
	pauseTask(taskId: TaskId): Promise<void>;
	resumeTask(taskId: TaskId): Promise<void>;
	retryTask(taskId: TaskId): Promise<void>;
	getTask(taskId: TaskId): Promise<Task>;
	listTasks(filter?: TaskListFilter): Promise<Task[]>;
	getTaskEvents(taskId: TaskId): Promise<TaskEvent[]>;
	subscribeToTask(taskId: TaskId, listener: (event: TaskEvent) => void): TaskSubscription;
	subscribeToTaskList(filter: TaskListFilter | undefined, listener: (event: TaskEvent) => void): TaskSubscription;
	createWorkflow(request: WorkflowCreateRequest): Promise<Workflow>;
	getWorkflow(workflowId: WorkflowId): Promise<Workflow>;
	cancelWorkflow(workflowId: WorkflowId): Promise<void>;
	recoverIncompleteTasks(): Promise<void>;
	cleanupOldTasks(policy: TaskCleanupPolicy): Promise<void>;
}

export interface TaskClientApi {
	createTask(request: TaskCreateRequest): Promise<Task>;
	getTask(taskId: TaskId): Promise<Task>;
	listTasks(filter?: TaskListFilter): Promise<Task[]>;
	cancelTask(taskId: TaskId, reason?: string): Promise<void>;
	retryTask(taskId: TaskId): Promise<void>;
	subscribeToTask(taskId: TaskId, listener: (event: TaskEvent) => void): TaskSubscription;
	subscribeToTaskList(filter: TaskListFilter | undefined, listener: (event: TaskEvent) => void): TaskSubscription;
}
