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

export type MultiProviderSkillRoute =
	| 'anthropic'
	| 'openai-hosted'
	| 'openai-local'
	| 'current-provider';

export interface MultiProviderSkillRoutingRule {
	readonly workflowNeed: string;
	readonly route: MultiProviderSkillRoute;
	readonly reason: string;
}

export interface MultiProviderSkillSupport {
	readonly docsPath: string;
	readonly adapterPath: string;
	readonly sharedManifestFile: 'SKILL.md';
	readonly sharedMetadataFields: readonly ['name', 'description'];
	readonly sharedResourceDirectories: readonly AgentSkillResourceDirectory[];
	readonly authoringRules: readonly string[];
	readonly routingRules: readonly MultiProviderSkillRoutingRule[];
	readonly versionManifestFile: 'versions.json';
	readonly securityChecklist: readonly string[];
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

export const MULTI_PROVIDER_SKILL_SUPPORT = {
	docsPath: 'docs/skills/multi-provider.md',
	adapterPath: 'src/shared/skill-adapters.ts',
	sharedManifestFile: 'SKILL.md',
	sharedMetadataFields: ['name', 'description'],
	sharedResourceDirectories: AGENT_SKILL_RESOURCE_DIRECTORIES,
	authoringRules: [
		'Keep one folder per skill as the source of truth and upload it separately to each provider.',
		'Keep each skill focused on one repeatable concern.',
		'Write descriptions as trigger conditions for model selection.',
		'Move large references, templates, and examples into supporting files.',
		'Pin explicit provider versions in production and use latest only during development.',
		'Keep names lowercase, hyphen-separated, under 64 characters, and avoid Anthropic reserved terms.',
	],
	routingRules: [
		{
			workflowNeed: 'office-document-generation',
			route: 'anthropic',
			reason: 'Anthropic-managed document skills cover pptx, xlsx, docx, and pdf workflows.',
		},
		{
			workflowNeed: 'multi-turn-stateful-execution',
			route: 'anthropic',
			reason: 'Claude API containers can be reused across turns.',
		},
		{
			workflowNeed: 'own-infrastructure-code-execution',
			route: 'openai-local',
			reason: 'OpenAI local shell mode keeps execution on controlled infrastructure.',
		},
		{
			workflowNeed: 'skill-container-network-access',
			route: 'openai-hosted',
			reason: 'Anthropic API skills block network access from skills.',
		},
		{
			workflowNeed: 'more-than-eight-skills',
			route: 'openai-hosted',
			reason: 'Anthropic caps a request at eight skills.',
		},
		{
			workflowNeed: 'no-provider-specific-constraint',
			route: 'current-provider',
			reason: 'Use the provider already handling the conversation to avoid an extra API round trip.',
		},
	],
	versionManifestFile: 'versions.json',
	securityChecklist: [
		'Review SKILL.md and all referenced files for hidden instructions.',
		'Reject instructions that bypass safety, exfiltrate data, or hide actions.',
		'Review scripts for network calls, file access patterns, and package dependencies.',
		'Scope each skill to an approved workflow instead of a freely attachable user catalog.',
		'Require approval for write actions and high-impact operations.',
		'Check data residency and retention requirements before hosted execution.',
	],
} as const satisfies MultiProviderSkillSupport;

export function getSkillProviderSupport(
	providerId: string
): SkillProviderSupport | undefined {
	return SKILL_PROVIDER_SUPPORT[providerId.trim().toLowerCase() as SkillProviderId];
}

export function listSkillProviderSupport(): SkillProviderSupport[] {
	return Object.values(SKILL_PROVIDER_SUPPORT);
}
