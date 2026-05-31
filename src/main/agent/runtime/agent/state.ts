export type ReadFileState = Map<
	string,
	{
		timestamp: number;
		hash: string;
		isPartialView: boolean;
	}
>;

export type AppState = {
	activeInstructions: string[];
	readFileState: ReadFileState;
	metadata: Record<string, unknown>;
};
