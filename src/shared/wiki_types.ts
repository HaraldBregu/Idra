export interface WikiSchedule {
	enabled: boolean;
	cronExpression: string;
}

export interface WikiSettings {
	enabled: boolean;
	providerId: string;
	modelId: string;
	sourcePath: string;
	targetPath: string;
	autoFileAnswers: boolean;
	requireReviewForMajorChanges: boolean;
	retrievalPriority: 'wiki_first';
	lintOnStartup: boolean;
	schedule: WikiSchedule;
}

export interface WikiRunResult {
	processedSources: number;
	skippedSources: number;
	createdPages: number;
	updatedPages: number;
	completedAt: string;
	operationIds?: string[];
	claimsAdded?: number;
	contradictionsDetected?: number;
	pendingReviews?: number;
	validationErrors?: number;
}

export interface WikiStatus {
	running: boolean;
	enabled?: boolean;
	lastRun?: WikiRunResult;
	nextRunAt?: string;
	settingsPath: string;
	pendingReviews?: number;
}
