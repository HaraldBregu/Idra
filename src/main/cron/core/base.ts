import { Tool } from '../../agent/core/tool';
import type { CronService } from '../service';

/**
 * Base for cron agent tools. Holds the CronService the tool delegates to;
 * leaves the Tool context at its default since cron tools don't touch files.
 */
export abstract class CronTool extends Tool {
	constructor(protected readonly service: CronService) {
		super();
	}
}

export function requireString(input: Record<string, unknown>, key: string): string {
	const value = input[key];
	if (typeof value !== 'string' || !value.trim()) {
		throw new Error(`${key} is required and must be a non-empty string.`);
	}
	return value;
}

export function optionalString(
	input: Record<string, unknown>,
	key: string
): string | undefined {
	const value = input[key];
	return typeof value === 'string' && value.trim() ? value : undefined;
}

export function optionalNumber(
	input: Record<string, unknown>,
	key: string
): number | undefined {
	const value = input[key];
	return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
