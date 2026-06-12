import type { CronRetryPolicy } from './types';

export function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function mergeRetryPolicy(
	base: CronRetryPolicy,
	patch?: Partial<CronRetryPolicy>
): CronRetryPolicy {
	return {
		...base,
		...(patch ?? {}),
		retryableErrorCodes: patch?.retryableErrorCodes ?? base.retryableErrorCodes,
		nonRetryableErrorCodes: patch?.nonRetryableErrorCodes ?? base.nonRetryableErrorCodes,
	};
}
