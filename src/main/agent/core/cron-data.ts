export interface CronTaskData<TType extends string = string> {
	readonly type: TType;
}
