export const AGENT_SKILL_RESOURCE_DIRECTORIES = [
	'scripts',
	'references',
	'templates',
	'assets',
] as const;

export type AgentSkillResourceDirectory = (typeof AGENT_SKILL_RESOURCE_DIRECTORIES)[number];

export type SkillProviderId = 'anthropic' | 'openai';

export type SkillProviderRuntimeMode =
	| 'api-container-skills'
	| 'claude-code-local-directory'
	| 'hosted-shell-skill-reference'
	| 'local-shell-skill-path';

export interface SkillProviderPackageLimits {
	readonly maxFiles?: number;
	readonly maxFileBytes?: number;
	readonly maxHostedZipBytes?: number;
	readonly maxUploadBytes?: number;
	readonly maxSkillsPerRequest?: number;
	readonly maxManifestNameChars?: number;
	readonly manifestNamePattern?: string;
	readonly reservedManifestNameTerms?: readonly string[];
}

export interface SkillProviderSupport {
	readonly providerId: SkillProviderId;
	readonly providerName: string;
	readonly docsPath: string;
	readonly runtimeModes: readonly SkillProviderRuntimeMode[];
	readonly resourceDirectories: readonly AgentSkillResourceDirectory[];
	readonly packageLimits: SkillProviderPackageLimits;
	readonly versionSelection: readonly string[];
	readonly safetyNotes: readonly string[];
}

export const SKILL_PROVIDER_SUPPORT = {
	anthropic: {
		providerId: 'anthropic',
		providerName: 'Anthropic',
		docsPath: 'docs/skills/anthropic.md',
		runtimeModes: ['api-container-skills', 'claude-code-local-directory'],
		resourceDirectories: AGENT_SKILL_RESOURCE_DIRECTORIES,
		packageLimits: {
			maxUploadBytes: 30 * 1024 * 1024,
			maxSkillsPerRequest: 8,
			maxManifestNameChars: 64,
			manifestNamePattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
			reservedManifestNameTerms: ['anthropic', 'claude'],
		},
		versionSelection: ['latest', 'exact-version'],
		safetyNotes: [
			'Claude API skills require code execution and container.skills.',
			'Claude API custom skills run without skill-level network access or runtime package installation.',
			'Generated files must be handled through the Files API when using Claude API code execution.',
		],
	},
	openai: {
		providerId: 'openai',
		providerName: 'OpenAI',
		docsPath: 'docs/skills/openai.md',
		runtimeModes: ['hosted-shell-skill-reference', 'local-shell-skill-path'],
		resourceDirectories: AGENT_SKILL_RESOURCE_DIRECTORIES,
		packageLimits: {
			maxHostedZipBytes: 50 * 1024 * 1024,
			maxFiles: 500,
			maxFileBytes: 25 * 1024 * 1024,
		},
		versionSelection: ['default_version', 'latest', 'exact-version'],
		safetyNotes: [
			'Review skills before attaching them to Responses API requests.',
			'Map approved skills to specific product workflows instead of exposing an open catalog.',
			'Require approval for write actions and high-impact operations.',
		],
	},
} as const satisfies Record<SkillProviderId, SkillProviderSupport>;

export function getSkillProviderSupport(
	providerId: string
): SkillProviderSupport | undefined {
	return SKILL_PROVIDER_SUPPORT[providerId.trim().toLowerCase() as SkillProviderId];
}

export function listSkillProviderSupport(): SkillProviderSupport[] {
	return Object.values(SKILL_PROVIDER_SUPPORT);
}
