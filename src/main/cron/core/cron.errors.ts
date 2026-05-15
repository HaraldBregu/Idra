import type { CronJsonObject } from './cron.types';

export class CronSchedulerError extends Error {
	readonly code: string;
	readonly safeUserMessage: string;
	readonly retryable: boolean;
	readonly metadata?: CronJsonObject;

	constructor(input: {
		code: string;
		message: string;
		safeUserMessage?: string;
		retryable?: boolean;
		metadata?: CronJsonObject;
	}) {
		super(input.message);
		this.name = this.constructor.name;
		this.code = input.code;
		this.safeUserMessage = input.safeUserMessage ?? input.message;
		this.retryable = input.retryable ?? false;
		this.metadata = input.metadata;
	}

	toRecordError(): {
		code: string;
		message: string;
		safeUserMessage: string;
		retryable: boolean;
		metadata?: CronJsonObject;
	} {
		return {
			code: this.code,
			message: this.message,
			safeUserMessage: this.safeUserMessage,
			retryable: this.retryable,
			metadata: this.metadata,
		};
	}
}

export class CronScheduleValidationError extends CronSchedulerError {
	constructor(message: string, metadata?: CronJsonObject) {
		super({ code: 'CRON_SCHEDULE_VALIDATION_FAILED', message, safeUserMessage: message, metadata });
	}
}

export class CronExpressionError extends CronScheduleValidationError {
	constructor(message: string, metadata?: CronJsonObject) {
		super(message, metadata);
		this.name = 'CronExpressionError';
	}
}

export class CronPermissionError extends CronSchedulerError {
	constructor(message: string, metadata?: CronJsonObject) {
		super({ code: 'CRON_PERMISSION_DENIED', message, safeUserMessage: message, metadata });
	}
}

export class CronScheduleNotFoundError extends CronSchedulerError {
	constructor(scheduleId: string) {
		super({
			code: 'CRON_SCHEDULE_NOT_FOUND',
			message: `Cron schedule not found: ${scheduleId}`,
			safeUserMessage: 'Schedule not found.',
			metadata: { scheduleId },
		});
	}
}

export class CronScheduleConflictError extends CronSchedulerError {
	constructor(message: string, metadata?: CronJsonObject) {
		super({ code: 'CRON_SCHEDULE_CONFLICT', message, safeUserMessage: message, metadata });
	}
}

export class CronScheduleLockError extends CronSchedulerError {
	constructor(message: string, metadata?: CronJsonObject) {
		super({
			code: 'CRON_SCHEDULE_LOCK_FAILED',
			message,
			safeUserMessage: 'The schedule is currently locked by another runner.',
			retryable: true,
			metadata,
		});
	}
}

export class CronScheduleStoreError extends CronSchedulerError {
	constructor(message: string, metadata?: CronJsonObject) {
		super({
			code: 'CRON_SCHEDULE_STORE_ERROR',
			message,
			safeUserMessage: 'Schedule storage failed.',
			retryable: true,
			metadata,
		});
	}
}

export class CronScheduleExecutionError extends CronSchedulerError {
	constructor(message: string, metadata?: CronJsonObject, retryable = false) {
		super({
			code: retryable ? 'CRON_SCHEDULE_EXECUTION_TRANSIENT' : 'CRON_SCHEDULE_EXECUTION_FAILED',
			message,
			safeUserMessage: 'The scheduled run could not be created.',
			retryable,
			metadata,
		});
	}
}

export class CronScheduleConfirmationRequiredError extends CronSchedulerError {
	constructor(message: string, metadata?: CronJsonObject) {
		super({
			code: 'CRON_SCHEDULE_CONFIRMATION_REQUIRED',
			message,
			safeUserMessage: 'User confirmation is required before this schedule can be created.',
			metadata,
		});
	}
}

export class CronScheduleFrequencyLimitError extends CronScheduleValidationError {
	constructor(message: string, metadata?: CronJsonObject) {
		super(message, metadata);
		this.name = 'CronScheduleFrequencyLimitError';
	}
}

export class CronScheduleRecoveryError extends CronSchedulerError {
	constructor(message: string, metadata?: CronJsonObject) {
		super({
			code: 'CRON_SCHEDULE_RECOVERY_FAILED',
			message,
			safeUserMessage: 'Schedule recovery failed.',
			retryable: true,
			metadata,
		});
	}
}

export function toCronRecordError(error: unknown): {
	code: string;
	message: string;
	safeUserMessage: string;
	retryable: boolean;
	metadata?: CronJsonObject;
} {
	if (error instanceof CronSchedulerError) return error.toRecordError();
	if (error instanceof Error) {
		return {
			code: 'CRON_UNKNOWN_ERROR',
			message: error.message,
			safeUserMessage: 'The schedule operation failed.',
			retryable: false,
		};
	}
	return {
		code: 'CRON_UNKNOWN_ERROR',
		message: String(error),
		safeUserMessage: 'The schedule operation failed.',
		retryable: false,
	};
}
