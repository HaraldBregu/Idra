export const SKILL_CATEGORIES = [
	'communication',
	'research',
	'coding',
	'planning',
	'analytics',
	'productivity',
	'content',
	'workflow',
	'automation',
	'support',
	'retrieval',
	'reasoning',
	'creative',
	'operations',
	'developerTools',
] as const;

export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

export type SkillVisibility = 'public' | 'private' | 'internal' | 'unlisted';

export type SkillSafetyLevel = 'low' | 'medium' | 'high' | 'restricted';

export interface SkillExampleManifest {
	description?: string;
	input?: unknown;
	output?: unknown;
}

export interface SkillDependencyManifest {
	id: string;
	version?: string;
	optional?: boolean;
}

export interface SkillManifest {
	id?: string;
	name: string;
	description?: string;
	license?: string;
	compatibility?: string;
	category?: SkillCategory;
	tags?: string[];
	version?: string;
	author?: string;
	enabled?: boolean;
	visibility?: SkillVisibility;
	safetyLevel?: SkillSafetyLevel;
	permissionsRequired?: string[];
	requiredTools?: string[];
	allowedTools?: string[];
	requiredConnectors?: string[];
	requiredMemoryKinds?: string[];
	inputSchema?: Record<string, unknown>;
	outputSchema?: Record<string, unknown>;
	estimatedCost?: number;
	estimatedLatency?: number;
	reliabilityScore?: number;
	examples?: SkillExampleManifest[];
	dependencies?: SkillDependencyManifest[];
	deprecated?: boolean;
	metadata?: Record<string, unknown>;
}

export interface SkillInfo {
	id: string;
	folderPath: string;
	skillPath?: string;
	manifest: SkillManifest;
}

export interface SkillDownloadResult {
	id: string;
	destinationPath: string;
}
