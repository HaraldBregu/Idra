import { SKILL_CATEGORIES } from './skills_definitions';

export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

export type SkillVisibility = 'public' | 'private' | 'internal' | 'unlisted';

export type SkillSafetyLevel = 'low' | 'medium' | 'high' | 'restricted';

export type SkillSource = 'local-filesystem';

export type SkillTrust = 'user-controlled';

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
	name: string;
	description: string;
	location: string;
	folderPath: string;
	skillPath?: string;
	manifest: SkillManifest;
	source: SkillSource;
	trust: SkillTrust;
	hash: string;
	diagnostics?: SkillDiagnostic[];
	structure?: SkillStructureInfo;
}

export interface SkillDownloadResult {
	id: string;
	destinationPath: string;
	name?: string;
}

export interface SkillLoadResult {
	id: string;
	name: string;
	directory: string;
	content: string;
	source: SkillSource;
	trust: SkillTrust;
	hash: string;
	allowedTools?: string[];
}

export interface SkillFrontmatter {
	name: string;
	description: string;
	license?: string;
	compatibility?: string;
	metadata?: Record<string, unknown>;
	allowedTools?: string[];
}

export interface SkillSearchOptions {
	names?: string[];
	limit?: number;
}

export interface SkillSearchResult {
	id: string;
	name: string;
	description: string;
	score: number;
	reason: string;
}

export interface SkillSupportFile {
	relativePath: string;
	kind: 'script' | 'reference' | 'asset' | 'file';
	size: number;
}

export interface SkillValidationIssue {
	code: string;
	message: string;
}

export interface SkillValidationResult {
	valid: boolean;
	issues: SkillValidationIssue[];
	skill?: {
		info: SkillInfo;
		frontmatter: SkillFrontmatter;
		instructions?: string;
	};
}

export interface SkillDetails extends SkillInfo {
	frontmatter: SkillFrontmatter;
	instructions: string;
	supportFiles: SkillSupportFile[];
}

export interface SkillDeleteResult {
	id: string;
	name: string;
	deleted: boolean;
}

export interface SkillDiagnostic {
	level: 'warning' | 'error';
	code: string;
	message: string;
}

export interface SkillStructureInfo {
	format: 'agent-skill';
	standard: 'agentskills.io';
	kind: 'direct' | 'container-child';
	resourceDirectories: string[];
}

export interface SkillImportSkipped {
	name: string;
	sourcePath: string;
	reason: string;
}

export interface SkillImportResult {
	imported: SkillInfo[];
	skipped: SkillImportSkipped[];
}

export interface AnthropicSkillEntry {
	type: 'anthropic' | 'custom';
	skill_id: string;
	version?: string;
}

export interface AnthropicSkillContainer {
	skills: AnthropicSkillEntry[];
}

export interface OpenAIHostedSkillEntry {
	type: 'skill_reference';
	skill_id: string;
	version?: number | 'latest';
}

export interface OpenAILocalSkillEntry {
	name: string;
	description: string;
	path: string;
}

export type SkillAdapterTarget =
	| { provider: 'anthropic'; remoteId: string; version?: string }
	| { provider: 'openai-hosted'; remoteId: string; version?: number | 'latest' }
	| { provider: 'openai-local' };

export interface ResolvedSkillAttachment {
	anthropic?: AnthropicSkillContainer;
	openaiHosted?: OpenAIHostedSkillEntry[];
	openaiLocal?: OpenAILocalSkillEntry[];
}
