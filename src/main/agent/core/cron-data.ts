import type { Tool } from './tool';

export interface CronTaskData<TType extends string = string> {
	readonly type: TType;
}

export abstract class CronData<TData extends CronTaskData = CronTaskData> {
	abstract readonly id: string;
	abstract readonly expression: string;
	abstract readonly data: TData;
	readonly name?: string;
	readonly description?: string;
	readonly timezone?: string;
	readonly enabled?: boolean;
	readonly runOnStart?: boolean;

	tools(): Tool[] {
		return [];
	}

	abstract run(): void | Promise<void>;
}
