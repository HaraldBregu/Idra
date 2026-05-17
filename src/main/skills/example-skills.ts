import type {
	SkillCapabilityResult,
	SkillContext,
	SkillDefinition,
} from './types';

function keywords(context: SkillContext, words: string[]): SkillCapabilityResult {
	const text = context.intent.toLowerCase();
	const hits = words.filter((word) => text.includes(word.toLowerCase()));
	const confidence = hits.length / Math.max(words.length, 1);
	return {
		canHandle: hits.length > 0,
		confidence: Math.min(1, 0.35 + confidence),
		reasons: hits.map((hit) => `Matched "${hit}"`),
	};
}

function sentences(value: string, limit: number): string[] {
	return value
		.replace(/\s+/g, ' ')
		.split(/(?<=[.!?])\s+/)
		.filter(Boolean)
		.slice(0, limit);
}

function baseSkill<TInput, TOutput>(
	skill: Omit<SkillDefinition<TInput, TOutput>, 'contract' | 'estimatedCost' | 'estimatedLatency' | 'reliabilityScore' | 'examples' | 'metadata'> &
		Partial<Pick<SkillDefinition<TInput, TOutput>, 'contract' | 'estimatedCost' | 'estimatedLatency' | 'reliabilityScore' | 'examples' | 'metadata'>>
): SkillDefinition<TInput, TOutput> {
	return {
		...skill,
		estimatedCost: skill.estimatedCost ?? { amount: 1, unit: 'abstract' },
		estimatedLatency: skill.estimatedLatency ?? { p50Ms: 1500 },
		reliabilityScore: skill.reliabilityScore ?? 0.85,
		examples: skill.examples ?? [],
		metadata: skill.metadata ?? {},
		contract: skill.contract ?? {
			inputs: skill.inputSchema,
			outputs: skill.outputSchema,
			sideEffects: [],
			permissionsRequired: skill.permissionsRequired,
			allowedTools: skill.requiredTools,
			allowedConnectors: skill.requiredConnectors,
			memoryAccess: skill.requiredMemoryKinds.map((kind) => ({
				kind,
				access: 'read',
				purpose: 'Skill execution context',
			})),
			failureBehavior: ['Return a structured SkillResult with warnings and provenance.'],
		},
	};
}

export interface SummarizeDocumentInput {
	title?: string;
	documentText: string;
	maxBullets?: number;
}

export interface SummarizeDocumentOutput {
	title?: string;
	summary: string;
	bullets: string[];
}

const SummarizeDocumentSkill = baseSkill<SummarizeDocumentInput, SummarizeDocumentOutput>({
	id: 'summarize-document',
	name: 'SummarizeDocumentSkill',
	description: 'Summarize a document into a concise structured brief.',
	category: 'content',
	tags: ['summary', 'document', 'brief'],
	version: '1.0.0',
	author: 'Friday',
	enabled: true,
	visibility: 'public',
	safetyLevel: 'low',
	permissionsRequired: [],
	requiredTools: [],
	requiredConnectors: [],
	requiredMemoryKinds: [],
	dependencies: [],
	inputSchema: {
		type: 'object',
		properties: {
			title: { type: 'string' },
			documentText: { type: 'string' },
			maxBullets: { type: 'number' },
		},
		required: ['documentText'],
		additionalProperties: false,
	},
	outputSchema: {
		type: 'object',
		properties: {
			title: { type: 'string' },
			summary: { type: 'string' },
			bullets: { type: 'array', items: { type: 'string' } },
		},
		required: ['summary', 'bullets'],
		additionalProperties: false,
	},
	async canHandle(context) {
		return keywords(context, ['summarize', 'summary', 'document', 'brief']);
	},
	async execute(input, context) {
		const maxBullets = Math.max(1, Math.min(input.maxBullets ?? 5, 10));
		const bullets = sentences(input.documentText, maxBullets);
		const summary = bullets.slice(0, 2).join(' ') || input.documentText.slice(0, 280);
		return context.complete({
			...(input.title ? { title: input.title } : {}),
			summary,
			bullets,
		});
	},
});

export interface ResearchTopicInput {
	topic: string;
	maxSources?: number;
	sources?: Array<{ title?: string; url?: string; text: string }>;
}

export interface ResearchTopicOutput {
	topic: string;
	summary: string;
	findings: string[];
	sources: Array<{ title?: string; url?: string }>;
}

const ResearchTopicSkill = baseSkill<ResearchTopicInput, ResearchTopicOutput>({
	id: 'research-topic',
	name: 'ResearchTopicSkill',
	description: 'Research a topic and produce findings with source provenance.',
	category: 'research',
	tags: ['research', 'sources', 'topic'],
	version: '1.0.0',
	author: 'Friday',
	enabled: true,
	visibility: 'public',
	safetyLevel: 'medium',
	permissionsRequired: ['tool:web_fetch'],
	requiredTools: ['web_fetch'],
	requiredConnectors: [],
	requiredMemoryKinds: ['preferences'],
	dependencies: [],
	inputSchema: {
		type: 'object',
		properties: {
			topic: { type: 'string' },
			maxSources: { type: 'number' },
			sources: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						title: { type: 'string' },
						url: { type: 'string' },
						text: { type: 'string' },
					},
					required: ['text'],
				},
			},
		},
		required: ['topic'],
		additionalProperties: false,
	},
	outputSchema: {
		type: 'object',
		properties: {
			topic: { type: 'string' },
			summary: { type: 'string' },
			findings: { type: 'array', items: { type: 'string' } },
			sources: { type: 'array', items: { type: 'object' } },
		},
		required: ['topic', 'summary', 'findings', 'sources'],
		additionalProperties: false,
	},
	async canHandle(context) {
		return keywords(context, ['research', 'latest', 'topic', 'compare', 'sources']);
	},
	async execute(input, context) {
		const maxSources = Math.max(1, Math.min(input.maxSources ?? 3, 10));
		const provided = input.sources?.slice(0, maxSources) ?? [];
		const fetched: string[] = [];
		for (const source of provided.filter((item) => item.url).slice(0, maxSources)) {
			const result = await context.callTool('web_fetch', { url: source.url as string });
			const text = result.content
				.map((block) => (block.type === 'text' ? block.text : ''))
				.join(' ')
				.slice(0, 600);
			if (text) fetched.push(text);
		}
		const sourceText = [...provided.map((source) => source.text), ...fetched].join(' ');
		const findings = sentences(sourceText || `Research topic: ${input.topic}`, maxSources).map((finding) =>
			finding.replace(/\s+/g, ' ').trim()
		);
		const summary =
			findings.slice(0, 2).join(' ') ||
			`Research plan for ${input.topic}: gather authoritative sources, compare claims, and cite provenance.`;
		return context.complete({
			topic: input.topic,
			summary,
			findings,
			sources: provided.map((source) => ({ title: source.title, url: source.url })),
		});
	},
});

export interface DraftProfessionalEmailInput {
	recipient?: string;
	subject: string;
	brief: string;
	tone?: 'concise' | 'executive' | 'friendly' | 'formal';
}

export interface DraftProfessionalEmailOutput {
	subject: string;
	body: string;
	requiresReview: boolean;
}

const DraftProfessionalEmailSkill = baseSkill<DraftProfessionalEmailInput, DraftProfessionalEmailOutput>({
	id: 'draft-professional-email',
	name: 'DraftProfessionalEmailSkill',
	description: 'Draft a professional email from a brief without sending it.',
	category: 'communication',
	tags: ['email', 'draft', 'communication'],
	version: '1.0.0',
	author: 'Friday',
	enabled: true,
	visibility: 'public',
	safetyLevel: 'low',
	permissionsRequired: [],
	requiredTools: [],
	requiredConnectors: [],
	requiredMemoryKinds: ['preferences'],
	dependencies: [],
	inputSchema: {
		type: 'object',
		properties: {
			recipient: { type: 'string' },
			subject: { type: 'string' },
			brief: { type: 'string' },
			tone: { type: 'string', enum: ['concise', 'executive', 'friendly', 'formal'] },
		},
		required: ['subject', 'brief'],
		additionalProperties: false,
	},
	outputSchema: {
		type: 'object',
		properties: {
			subject: { type: 'string' },
			body: { type: 'string' },
			requiresReview: { type: 'boolean' },
		},
		required: ['subject', 'body', 'requiresReview'],
		additionalProperties: false,
	},
	async canHandle(context) {
		return keywords(context, ['email', 'draft', 'message', 'send']);
	},
	async execute(input, context) {
		const greeting = input.recipient ? `Hi ${input.recipient},` : 'Hi,';
		const signoff =
			context.userPreferences.preferredWorkflowStyles.includes('formal') || input.tone === 'formal'
				? 'Regards'
				: 'Best';
		return context.complete({
			subject: input.subject,
			body: `${greeting}\n\n${input.brief.trim()}\n\n${signoff},\nFriday`,
			requiresReview: true,
		});
	},
});

const CreateMeetingAgendaSkill = baseSkill<
	{ topic: string; attendees?: string[]; durationMinutes?: number },
	{ agenda: string[]; title: string }
>({
	id: 'create-meeting-agenda',
	name: 'CreateMeetingAgendaSkill',
	description: 'Create a focused meeting agenda from a topic and constraints.',
	category: 'productivity',
	tags: ['meeting', 'agenda', 'planning'],
	version: '1.0.0',
	author: 'Friday',
	enabled: true,
	visibility: 'public',
	safetyLevel: 'low',
	permissionsRequired: [],
	requiredTools: [],
	requiredConnectors: [],
	requiredMemoryKinds: [],
	dependencies: [],
	inputSchema: {
		type: 'object',
		properties: {
			topic: { type: 'string' },
			attendees: { type: 'array', items: { type: 'string' } },
			durationMinutes: { type: 'number' },
		},
		required: ['topic'],
		additionalProperties: false,
	},
	outputSchema: {
		type: 'object',
		properties: {
			title: { type: 'string' },
			agenda: { type: 'array', items: { type: 'string' } },
		},
		required: ['title', 'agenda'],
		additionalProperties: false,
	},
	async canHandle(context) {
		return keywords(context, ['meeting', 'agenda', 'workshop']);
	},
	async execute(input, context) {
		return context.complete({
			title: input.topic,
			agenda: [
				'Confirm objective and desired decision',
				'Review current context',
				'Discuss options and risks',
				'Assign owners and next steps',
			],
		});
	},
});

const PlanTripSkill = baseSkill<
	{ destination: string; days?: number; interests?: string[] },
	{ destination: string; itinerary: string[] }
>({
	id: 'plan-trip',
	name: 'PlanTripSkill',
	description: 'Plan a lightweight trip itinerary from destination and interests.',
	category: 'planning',
	tags: ['trip', 'travel', 'itinerary'],
	version: '1.0.0',
	author: 'Friday',
	enabled: true,
	visibility: 'public',
	safetyLevel: 'low',
	permissionsRequired: [],
	requiredTools: [],
	requiredConnectors: [],
	requiredMemoryKinds: ['preferences'],
	dependencies: [],
	inputSchema: {
		type: 'object',
		properties: {
			destination: { type: 'string' },
			days: { type: 'number' },
			interests: { type: 'array', items: { type: 'string' } },
		},
		required: ['destination'],
		additionalProperties: false,
	},
	outputSchema: {
		type: 'object',
		properties: {
			destination: { type: 'string' },
			itinerary: { type: 'array', items: { type: 'string' } },
		},
		required: ['destination', 'itinerary'],
		additionalProperties: false,
	},
	async canHandle(context) {
		return keywords(context, ['trip', 'travel', 'itinerary', 'plan']);
	},
	async execute(input, context) {
		const days = Math.max(1, Math.min(input.days ?? 3, 14));
		const interests = input.interests?.join(', ') || 'local highlights';
		return context.complete({
			destination: input.destination,
			itinerary: Array.from({ length: days }, (_, index) => `Day ${index + 1}: Explore ${interests}.`),
		});
	},
});

const MultiStepResearchAndEmailSkill = baseSkill<
	{ topic: string; recipient?: string; maxSources?: number },
	{ research: ResearchTopicOutput; summary: SummarizeDocumentOutput; email: DraftProfessionalEmailOutput }
>({
	id: 'multi-step-research-and-email',
	name: 'MultiStepResearchAndEmailSkill',
	description: 'Research a topic, summarize it, and draft a concise professional email.',
	category: 'workflow',
	tags: ['research', 'summary', 'email', 'workflow'],
	version: '1.0.0',
	author: 'Friday',
	enabled: true,
	visibility: 'public',
	safetyLevel: 'medium',
	permissionsRequired: ['tool:web_fetch'],
	requiredTools: ['web_fetch'],
	requiredConnectors: [],
	requiredMemoryKinds: ['preferences'],
	dependencies: [
		{ id: 'research-topic', version: '^1.0.0' },
		{ id: 'summarize-document', version: '^1.0.0' },
		{ id: 'draft-professional-email', version: '^1.0.0' },
	],
	inputSchema: {
		type: 'object',
		properties: {
			topic: { type: 'string' },
			recipient: { type: 'string' },
			maxSources: { type: 'number' },
		},
		required: ['topic'],
		additionalProperties: false,
	},
	outputSchema: {
		type: 'object',
		properties: {
			research: { type: 'object' },
			summary: { type: 'object' },
			email: { type: 'object' },
		},
		required: ['research', 'summary', 'email'],
		additionalProperties: false,
	},
	async canHandle(context) {
		return keywords(context, ['research', 'summary', 'email', 'executive']);
	},
	async execute(input, context) {
		const research = await context.executeSkill<ResearchTopicInput, ResearchTopicOutput>('research-topic', {
			topic: input.topic,
			...(typeof input.maxSources === 'number' ? { maxSources: input.maxSources } : {}),
		});
		if (!research.success || !research.data) {
			return context.fail({ code: 'execution_failed', message: 'Research subskill failed.' });
		}
		const summary = await context.executeSkill<SummarizeDocumentInput, SummarizeDocumentOutput>(
			'summarize-document',
			{
				title: input.topic,
				documentText: [research.data.summary, ...research.data.findings].join(' '),
				maxBullets: 4,
			}
		);
		if (!summary.success || !summary.data) {
			return context.fail({ code: 'execution_failed', message: 'Summary subskill failed.' });
		}
		const email = await context.executeSkill<DraftProfessionalEmailInput, DraftProfessionalEmailOutput>(
			'draft-professional-email',
			{
				...(input.recipient ? { recipient: input.recipient } : {}),
				subject: `Executive summary: ${input.topic}`,
				brief: summary.data.summary,
				tone: 'executive',
			}
		);
		if (!email.success || !email.data) {
			return context.fail({ code: 'execution_failed', message: 'Email subskill failed.' });
		}
		return context.complete({ research: research.data, summary: summary.data, email: email.data });
	},
});

export function createExampleSkills(): SkillDefinition[] {
	return [
		SummarizeDocumentSkill,
		ResearchTopicSkill,
		DraftProfessionalEmailSkill,
		CreateMeetingAgendaSkill,
		PlanTripSkill,
		MultiStepResearchAndEmailSkill,
	];
}
