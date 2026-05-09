export type TaskPriority = 'low' | 'normal' | 'high';

export type TaskState = 'queued' | 'started' | 'running' | 'finished' | 'cancelled';

export interface TaskInfo {
    taskId: string;
    type: string;
    status: TaskState;
    priority: TaskPriority;
    startedAt?: number;
    completedAt?: number;
    windowId?: number;
    error?: string;
    durationMs?: number;
    metadata?: Record<string, unknown>;
    data?: string;
}

export interface TaskQueueStatus {
    queued: number;
    running: number;
    completed: number;
}

export interface TaskEvent {
    state: TaskState;
    taskId: string;
    data: { success: true; data: string } | { success: false; error: string };
    metadata: Record<string, unknown>;
}

export interface TaskAction<TInput = unknown> {
    type: string;
    input: TInput;
    metadata: Record<string, unknown>;
}