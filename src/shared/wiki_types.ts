export interface WikiSchedule {
	enabled: boolean;
	cronExpression: string;
}

export interface WikiSettings {
	providerId: string;
	modelId: string;
	sourcePath: string;
	targetPath: string;
	schedule: WikiSchedule;
}

export interface WikiRunResult {
	processedSources: number;
	skippedSources: number;
	createdPages: number;
	updatedPages: number;
	completedAt: string;
}

export interface WikiStatus {
	running: boolean;
	lastRun?: WikiRunResult;
	nextRunAt?: string;
	settingsPath: string;
}
