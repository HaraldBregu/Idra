export type Metrics = {
	measure<T>(name: string, work: () => Promise<T>): Promise<T>;
};
