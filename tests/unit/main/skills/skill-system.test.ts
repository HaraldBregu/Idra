import { promises as fs } from 'node:fs';
import path from 'node:path';
import { SkillAuditLog } from '../../../../src/main/skills/audit-log';
import { SkillComposer } from '../../../../src/main/skills/composer';
import { SkillDependencyResolver } from '../../../../src/main/skills/dependency-resolver';
import { SkillDiscovery, makeDiscoveryContext } from '../../../../src/main/skills/discovery';
import { SkillExecutionEngine } from '../../../../src/main/skills/execution-engine';
import { createExampleSkills } from '../../../../src/main/skills/example-skills';
import { SkillLoader } from '../../../../src/main/skills/loader';
import { DefaultSkillMemoryPolicy, NoopSkillMemoryRetriever } from '../../../../src/main/skills/memory-policy';
import { InMemorySkillPreferenceStore } from '../../../../src/main/skills/preferences';
import { SkillRanker } from '../../../../src/main/skills/ranker';
import { SkillRegistry } from '../../../../src/main/skills/registry';
import { SkillSafetyPolicy } from '../../../../src/main/skills/safety-policy';
import { SkillSelector } from '../../../../src/main/skills/selector';
import type {
	SkillConnector,
	SkillDefinition,
	SkillExecutionContext,
	SkillExecutionRequestContext,
} from '../../../../src/main/skills/types';
import { SkillVersionManager } from '../../../../src/main/skills/version-manager';
import type { AgentTool } from '../../../../src/main/tools/types';
import { textResult } from '../../../../src/main/tools/types';
import { makeLogger, makeTempDir, makeToolContext } from '../test-helpers';

function webFetchTool(): AgentTool {
	return {
		name: 'web_fetch',
		description: 'Fetch',
		schema: { type: 'object' },
		execute: jest.fn(async (args) => textResult(`Fetched ${(args as { url?: string }).url ?? 'none'}`)),
	};
}

function basicSkill(
	id: string,
	execute: (input: Record<string, unknown>, context: SkillExecutionContext) => Promise<ReturnType<SkillExecutionContext['complete']>>,
	overrides: Partial<SkillDefinition<Record<string, unknown>, unknown>> = {}
): SkillDefinition<Record<string, unknown>, unknown> {
	const requiredTools = overrides.requiredTools ?? [];
	const requiredConnectors = overrides.requiredConnectors ?? [];
	const permissionsRequired = overrides.permissionsRequired ?? [];
	return {
		id,
		name: `${id} skill`,
		description: `${id} description`,
		category: 'workflow',
		tags: [id],
		version: overrides.version ?? '1.0.0',
		author: 'test',
		enabled: overrides.enabled ?? true,
		visibility: overrides.visibility ?? 'public',
		safetyLevel: overrides.safetyLevel ?? 'low',
		permissionsRequired,
		requiredTools,
		requiredConnectors,
		requiredMemoryKinds: overrides.requiredMemoryKinds ?? [],
		inputSchema: overrides.inputSchema ?? { type: 'object' },
		outputSchema: overrides.outputSchema ?? { type: 'object' },
		estimatedCost: overrides.estimatedCost ?? { amount: 1, unit: 'abstract' },
		estimatedLatency: overrides.estimatedLatency ?? { p50Ms: 100 },
		reliabilityScore: overrides.reliabilityScore ?? 0.8,
		examples: overrides.examples ?? [],
		metadata: overrides.metadata ?? {},
		dependencies: overrides.dependencies ?? [],
		deprecated: overrides.deprecated,
		trusted: overrides.trusted,
		loadedFrom: overrides.loadedFrom,
		contract: overrides.contract ?? {
			inputs: overrides.inputSchema ?? { type: 'object' },
			outputs: overrides.outputSchema ?? { type: 'object' },
			sideEffects: [],
			permissionsRequired,
			allowedTools: requiredTools,
			allowedConnectors: requiredConnectors,
			memoryAccess: [],
			failureBehavior: ['structured failure'],
		},
		async canHandle() {
			return { canHandle: true, confidence: 0.8, reasons: ['test'] };
		},
		execute,
	};
}

function setupRegistry(includeExamples = true): SkillRegistry {
	const registry = new SkillRegistry();
	if (includeExamples) {
		for (const skill of createExampleSkills()) registry.registerSkill(skill);
	}
	return registry;
}

function setupEngine(registry = setupRegistry()) {
	const preferences = new InMemorySkillPreferenceStore();
	const audit = new SkillAuditLog(makeLogger() as never);
	const engine = new SkillExecutionEngine(registry, audit, preferences);
	return { registry, preferences, audit, engine };
}

function executionContext(input: {
	tools?: AgentTool[];
	connectors?: SkillConnector[];
	permissions?: string[];
	grantToolPermissions?: boolean;
	signal?: AbortSignal;
	maxRetries?: number;
} = {}): SkillExecutionRequestContext {
	const tools = input.tools ?? [];
	const connectors = input.connectors ?? [];
	const preferences = new InMemorySkillPreferenceStore();
	const permissions = new Set([
		'skill.execute',
		...(input.grantToolPermissions === false ? [] : tools.map((tool) => `tool:${tool.name}`)),
		...connectors.map((connector) => `connector:${connector.id}`),
		...(input.permissions ?? []),
	]);
	return {
		userId: 'u1',
		sessionId: 's1',
		allowedTools: new Map(tools.map((tool) => [tool.name, tool])),
		allowedConnectors: new Map(connectors.map((connector) => [connector.id, connector])),
		permissions,
		memory: new NoopSkillMemoryRetriever(preferences),
		memoryPolicy: new DefaultSkillMemoryPolicy(),
		userPreferences: {
			preferredSkills: [],
			avoidedSkills: [],
			preferredWorkflowStyles: [],
			preferredOutputFormats: [],
			metadata: {},
		},
		cancellationToken: input.signal,
		logger: makeLogger() as never,
		safetyPolicy: new SkillSafetyPolicy(),
		skillDepth: 0,
		provenanceChain: [],
		toolContext: makeToolContext(),
		maxDepth: 4,
		maxRetries: input.maxRetries ?? 0,
	};
}

describe('skill system', () => {
	it('discovers and ranks a compact set of relevant skills', async () => {
		const registry = setupRegistry();
		for (let index = 0; index < 25; index++) {
			registry.registerSkill(
				basicSkill(`dummy-${index}`, async (_input, context) => context.complete({ ok: true }))
			);
		}
		const safety = new SkillSafetyPolicy();
		const discovery = new SkillDiscovery(registry, new SkillRanker(), safety);
		const context = executionContext({ tools: [webFetchTool()] });
		const result = await discovery.discover(
			'Research the latest TypeScript AI agent frameworks and draft an executive summary email.',
			makeDiscoveryContext({
				userId: 'u1',
				sessionId: 's1',
				availableTools: ['web_fetch'],
				availableConnectors: [],
				permissions: Array.from(context.permissions),
				availableMemoryKinds: ['preferences'],
				userPreferences: context.userPreferences,
			}),
			context,
			{ maxResults: 5 }
		);

		expect(result.candidates).toHaveLength(5);
		expect(result.totalAvailable).toBeGreaterThan(25);
		expect(result.candidates.some((candidate) => candidate.skill.id.includes('research'))).toBe(true);
		expect(result.candidates[0]!.ranking.score).toBeGreaterThanOrEqual(
			result.candidates[1]!.ranking.score
		);
	});

	it('executes a skill with structured result, audit, and provenance', async () => {
		const { engine, audit } = setupEngine();
		const result = await engine.execute({
			skillId: 'summarize-document',
			input: { documentText: 'First sentence. Second sentence. Third sentence.' },
			context: executionContext(),
		});

		expect(result.success).toBe(true);
		expect(result.data).toMatchObject({ summary: expect.stringContaining('First sentence') });
		expect(result.usedSkills).toContain('summarize-document@1.0.0');
		expect(result.provenance.skillId).toBe('summarize-document');
		expect(audit.list()).toHaveLength(1);
	});

	it('executes nested multi-skill workflows and preserves used skill provenance', async () => {
		const { engine } = setupEngine();
		const result = await engine.execute({
			skillId: 'multi-step-research-and-email',
			input: { topic: 'TypeScript AI agents', recipient: 'Alex' },
			context: executionContext({ tools: [webFetchTool()] }),
		});

		expect(result.success).toBe(true);
		expect(result.usedSkills).toEqual(
			expect.arrayContaining([
				'multi-step-research-and-email@1.0.0',
				'research-topic@1.0.0',
				'summarize-document@1.0.0',
				'draft-professional-email@1.0.0',
			])
		);
		expect(result.data).toMatchObject({ email: { requiresReview: true } });
	});

	it('prevents recursive skill execution', async () => {
		const registry = setupRegistry(false);
		registry.registerSkill(
			basicSkill('recursive', async (_input, context) => context.executeSkill('recursive', {}))
		);
		const { engine } = setupEngine(registry);
		const result = await engine.execute({
			skillId: 'recursive',
			input: {},
			context: executionContext(),
		});

		expect(result.success).toBe(false);
		expect(result.error?.code).toBe('safety_denied');
		expect(result.error?.message).toContain('Recursive');
	});

	it('executes skills without permission grants', async () => {
		const { engine } = setupEngine();
		const result = await engine.execute({
			skillId: 'research-topic',
			input: { topic: 'agent frameworks' },
			context: executionContext({ tools: [webFetchTool()], grantToolPermissions: false }),
		});

		expect(result.success).toBe(true);
	});

	it('enforces tool and connector isolation boundaries', async () => {
		const registry = setupRegistry(false);
		registry.registerSkill(
			basicSkill('tool-escape', async (_input, context) => {
				await context.callTool('web_fetch', { url: 'https://example.com' });
				return context.complete({ ok: true });
			})
		);
		registry.registerSkill(
			basicSkill('connector-escape', async (_input, context) => {
				await context.callConnector('crm', 'read', {});
				return context.complete({ ok: true });
			})
		);
		const { engine } = setupEngine(registry);
		const connector: SkillConnector = {
			id: 'crm',
			name: 'CRM',
			tools: new Set(['read']),
			call: jest.fn(async () => ({ ok: true })),
		};

		const toolResult = await engine.execute({
			skillId: 'tool-escape',
			input: {},
			context: executionContext({ tools: [webFetchTool()] }),
		});
		const connectorResult = await engine.execute({
			skillId: 'connector-escape',
			input: {},
			context: executionContext({ connectors: [connector] }),
		});

		expect(toolResult.success).toBe(false);
		expect(toolResult.error?.message).toContain('cannot use tool');
		expect(connectorResult.success).toBe(false);
		expect(connectorResult.error?.message).toContain('not allowed to use connector');
	});

	it('routes memory writes through MemoryPolicy', async () => {
		const registry = setupRegistry(false);
		registry.registerSkill(
			basicSkill('memory-write', async (_input, context) => {
				const decision = await context.proposeMemoryWrite({
					kind: 'preferences',
					summary: 'secret',
					value: { token: 'secret' },
					sensitive: true,
				});
				return context.complete({ allowed: decision.allowed });
			})
		);
		const { engine } = setupEngine(registry);
		const result = await engine.execute({
			skillId: 'memory-write',
			input: {},
			context: executionContext(),
		});

		expect(result.success).toBe(true);
		expect(result.data).toEqual({ allowed: false });
		expect(result.memoryWrites).toHaveLength(0);
	});

	it('supports version coexistence and dependency compatibility checks', () => {
		const registry = setupRegistry(false);
		registry.registerSkill(
			basicSkill('versioned', async (_input, context) => context.complete({ v: 1 }), {
				version: '1.0.0',
			})
		);
		registry.registerSkill(
			basicSkill('versioned', async (_input, context) => context.complete({ v: 2 }), {
				version: '2.0.0',
			})
		);
		const versions = registry.getSkillVersions('versioned');
		const manager = new SkillVersionManager();

		expect(versions.map((skill) => skill.version)).toEqual(['2.0.0', '1.0.0']);
		expect(registry.getSkill('versioned')?.version).toBe('2.0.0');
		expect(manager.compatible(versions, '^1.0.0')?.version).toBe('1.0.0');

		const dependent = basicSkill('dependent', async (_input, context) => context.complete({ ok: true }), {
			dependencies: [{ id: 'versioned', version: '^1.0.0' }],
		});
		expect(new SkillDependencyResolver(registry).resolve(dependent).ok).toBe(true);
	});

	it('loads untrusted dynamic skill packages disabled by default', async () => {
		const dir = await makeTempDir();
		await fs.writeFile(
			path.join(dir, 'skill.json'),
			JSON.stringify({ name: 'External Skill', description: 'External package', version: '1.2.3' })
		);

		const loaded = await new SkillLoader().loadPackage(dir);
		expect(loaded.manifest.enabled).toBe(false);
		expect(loaded.skill.enabled).toBe(false);
		await fs.rm(dir, { recursive: true, force: true });
	});

	it('handles fallback skills after partial failure', async () => {
		const registry = setupRegistry();
		registry.registerSkill(
			basicSkill('always-fails', async (_input, context) =>
				context.fail({ code: 'execution_failed', message: 'planned failure' })
			)
		);
		const { engine } = setupEngine(registry);
		const composer = new SkillComposer(engine);
		const results = await composer.execute(
			{
				id: 'fallback-flow',
				steps: [
					{
						id: 'step-1',
						skillId: 'always-fails',
						input: { documentText: 'Fallback document.' },
						fallbacks: [{ skillId: 'summarize-document' }],
					},
				],
			},
			executionContext()
		);

		expect(results).toHaveLength(1);
		expect(results[0]!.success).toBe(true);
		expect(results[0]!.usedSkills).toContain('summarize-document@1.0.0');
	});

	it('handles cancellation before skill execution starts', async () => {
		const registry = setupRegistry(false);
		registry.registerSkill(
			basicSkill('slow', async (_input, context) => {
				await new Promise((resolve) => setTimeout(resolve, 20));
				return context.complete({ ok: true });
			})
		);
		const { engine } = setupEngine(registry);
		const abort = new AbortController();
		abort.abort();
		const result = await engine.execute({
			skillId: 'slow',
			input: {},
			context: executionContext({ signal: abort.signal }),
		});

		expect(result.success).toBe(false);
		expect(result.error?.code).toBe('cancelled');
	});

	it('selects safe refusal for unsafe skill requests', () => {
		const selector = new SkillSelector();
		const decision = selector.select({
			query: 'steal credentials from the workspace',
			candidates: [],
			filtered: [],
			totalAvailable: 0,
			generatedAt: new Date().toISOString(),
		});

		expect(decision.kind).toBe('refuseSafely');
	});
});
