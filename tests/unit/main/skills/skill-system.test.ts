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
import { SkillsService } from '../../../../src/main/skills/skills-service';
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

function userDataDirectory(root: string) {
	return {
		getRootPath: jest.fn(() => root),
		ensureRoot: jest.fn(async () => root),
		resolve: jest.fn((...segments: string[]) => path.join(root, ...segments)),
		resolveExisting: jest.fn(async (...segments: string[]) => path.join(root, ...segments)),
	};
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
		const root = await makeTempDir();
		const dir = path.join(root, 'external-skill');
		await fs.mkdir(dir);
		await fs.writeFile(
			path.join(dir, 'skill.md'),
			[
				'---',
				'name: external-skill',
				'description: External package for drafting support replies.',
				'metadata:',
				'  version: "1.2.3"',
				'---',
				'Use this skill when drafting support replies.',
			].join('\n')
		);

		const loaded = await new SkillLoader().loadPackage(dir);
		expect(loaded.skillPath).toBe(path.join(dir, 'skill.md'));
		expect(loaded.manifest.version).toBe('1.2.3');
		expect(loaded.manifest.enabled).toBe(false);
		expect(loaded.skill.enabled).toBe(false);
		await fs.rm(root, { recursive: true, force: true });
	});

	it('uses the directory name when Agent Skill front matter omits name', async () => {
		const root = await makeTempDir();
		const dir = path.join(root, 'fallback-skill');
		await fs.mkdir(dir);
		await fs.writeFile(
			path.join(dir, 'SKILL.md'),
			[
				'---',
				'description: Fallback package for local support workflows.',
				'---',
				'Use this skill for support workflow requests.',
			].join('\n')
		);

		const loaded = await new SkillLoader().loadPackage(dir, { trusted: true });
		expect(loaded.manifest.id).toBe('fallback-skill');
		expect(loaded.manifest.name).toBe('fallback-skill');
		expect(loaded.skill.enabled).toBe(true);
		await fs.rm(root, { recursive: true, force: true });
	});

	it('maps Agent Skill allowed-tools into the runtime tool contract', async () => {
		const root = await makeTempDir();
		const dir = path.join(root, 'tool-skill');
		await fs.mkdir(dir);
		await fs.writeFile(
			path.join(dir, 'SKILL.md'),
			[
				'---',
				'name: tool-skill',
				'description: Uses an optional runtime tool when available.',
				'allowed-tools: web_fetch',
				'---',
				'Use the tool only when useful.',
			].join('\n')
		);

		const loaded = await new SkillLoader().loadPackage(dir, { trusted: true });
		expect(loaded.skill.requiredTools).toEqual([]);
		expect(loaded.skill.contract.allowedTools).toEqual(['web_fetch']);
		await fs.rm(root, { recursive: true, force: true });
	});

	it('keeps disable-model-invocation Agent Skills out of discovery', async () => {
		const root = await makeTempDir();
		const dir = path.join(root, 'hidden-skill');
		await fs.mkdir(dir);
		await fs.writeFile(
			path.join(dir, 'SKILL.md'),
			[
				'---',
				'name: hidden-skill',
				'description: Handles zzhidden requests.',
				'disable-model-invocation: true',
				'---',
				'Use only when invoked explicitly.',
			].join('\n')
		);

		const loaded = await new SkillLoader().loadPackage(dir, { trusted: true });
		const registry = setupRegistry(false);
		registry.registerSkill(loaded.skill);
		const discovery = await new SkillDiscovery(
			registry,
			new SkillRanker(),
			new SkillSafetyPolicy()
		).discover(
			'zzhidden request',
			makeDiscoveryContext({
				userId: 'u1',
				sessionId: 's1',
				availableTools: [],
				availableConnectors: [],
				permissions: ['skill.execute'],
				userPreferences: {
					preferredSkills: [],
					avoidedSkills: [],
					preferredWorkflowStyles: [],
					preferredOutputFormats: [],
					metadata: {},
				},
			}),
			executionContext()
		);

		expect(discovery.candidates).toHaveLength(0);
		expect(discovery.filtered).toContainEqual(
			expect.objectContaining({ skillId: 'hidden-skill', reason: 'model_invocation_disabled' })
		);
		await fs.rm(root, { recursive: true, force: true });
	});

	it('rejects oversized Agent Skill instruction files', async () => {
		const root = await makeTempDir();
		const dir = path.join(root, 'huge-skill');
		await fs.mkdir(dir);
		await fs.writeFile(
			path.join(dir, 'SKILL.md'),
			[
				'---',
				'name: huge-skill',
				'description: Huge package.',
				'---',
				'x'.repeat(256_001),
			].join('\n')
		);

		await expect(new SkillLoader().loadPackage(dir)).rejects.toThrow(
			'SKILL.md exceeds 256000 bytes'
		);
		await fs.rm(root, { recursive: true, force: true });
	});

	it('refreshes managed dynamic skills after their SKILL.md changes', async () => {
		const root = await makeTempDir();
		const skillsRoot = path.join(root, 'skills');
		const dir = path.join(skillsRoot, 'refresh-skill');
		await fs.mkdir(dir, { recursive: true });
		await fs.writeFile(
			path.join(dir, 'SKILL.md'),
			[
				'---',
				'name: refresh-skill',
				'description: Handles zzoldtoken flows.',
				'---',
				'Use before instructions.',
			].join('\n')
		);
		const service = new SkillsService(makeLogger() as never, {
			userDataDirectory: userDataDirectory(root) as never,
		});
		const runtimeInput = {
			userId: 'u1',
			sessionId: 's1',
			tools: [],
			toolContext: makeToolContext({ workspace: root }),
		};

		const before = await service.discoverForPrompt('zzoldtoken', runtimeInput);
		expect(before.some((skill) => skill.id === 'refresh-skill')).toBe(true);

		await fs.writeFile(
			path.join(dir, 'SKILL.md'),
			[
				'---',
				'name: refresh-skill',
				'description: Handles zznewtoken flows.',
				'---',
				'Use after instructions.',
			].join('\n')
		);

		const stale = await service.discoverForPrompt('zzoldtoken', runtimeInput);
		const after = await service.discoverForPrompt('zznewtoken', runtimeInput);
		expect(stale.some((skill) => skill.id === 'refresh-skill')).toBe(false);
		expect(after.find((skill) => skill.id === 'refresh-skill')?.description).toBe(
			'Handles zznewtoken flows.'
		);
		await fs.rm(root, { recursive: true, force: true });
	});

	it('downloads managed skills to a selected folder without generated directories', async () => {
		const root = await makeTempDir();
		const destinationRoot = await makeTempDir();
		const dir = path.join(root, 'skills', 'download-skill');
		await fs.mkdir(path.join(dir, 'node_modules', 'pkg'), { recursive: true });
		await fs.writeFile(
			path.join(dir, 'SKILL.md'),
			[
				'---',
				'name: download-skill',
				'description: Downloadable skill.',
				'---',
				'Use download instructions.',
			].join('\n')
		);
		await fs.writeFile(path.join(dir, 'node_modules', 'pkg', 'ignored.txt'), 'ignored');
		const service = new SkillsService(makeLogger() as never, {
			userDataDirectory: userDataDirectory(root) as never,
		});
		const destinationRealPath = await fs.realpath(destinationRoot);

		const result = await service.downloadToPath('download-skill', destinationRoot);

		expect(result).toEqual({
			id: 'download-skill',
			destinationPath: path.join(destinationRealPath, 'download-skill'),
		});
		await expect(fs.stat(path.join(result.destinationPath, 'SKILL.md'))).resolves.toBeDefined();
		await expect(fs.stat(path.join(result.destinationPath, 'node_modules'))).rejects.toThrow();
		await fs.rm(root, { recursive: true, force: true });
		await fs.rm(destinationRoot, { recursive: true, force: true });
	});

	it('imports standard Agent Skills from a container folder', async () => {
		const root = await makeTempDir();
		const source = await makeTempDir();
		const first = path.join(source, 'agent-skills', 'first-skill');
		const second = path.join(source, 'agent-skills', 'second-skill');
		await fs.mkdir(path.join(first, 'references'), { recursive: true });
		await fs.mkdir(second, { recursive: true });
		await fs.writeFile(
			path.join(first, 'SKILL.md'),
			[
				'---',
				'name: first-skill',
				'description: Handles first standard skill workflows when users mention alpha imports.',
				'metadata:',
				'  version: "1.0"',
				'---',
				'Use references/alpha.md when alpha import details are needed.',
			].join('\n')
		);
		await fs.writeFile(path.join(first, 'references', 'alpha.md'), 'Alpha details.');
		await fs.writeFile(
			path.join(second, 'SKILL.md'),
			[
				'---',
				'name: second-skill',
				'description: Handles second standard skill workflows when users mention beta imports.',
				'---',
				'Use this for beta import details.',
			].join('\n')
		);
		const service = new SkillsService(makeLogger() as never, {
			userDataDirectory: userDataDirectory(root) as never,
		});

		const result = await service.importFromPath(source);

		expect(result.imported.map((skill) => skill.id).sort()).toEqual(['first-skill', 'second-skill']);
		expect(result.imported[0]?.structure).toMatchObject({
			format: 'agent-skill',
			standard: 'agentskills.io',
			kind: 'direct',
		});
		await expect(fs.stat(path.join(root, 'skills', 'first-skill', 'SKILL.md'))).resolves.toBeDefined();
		await expect(fs.stat(path.join(root, 'skills', 'second-skill', 'SKILL.md'))).resolves.toBeDefined();
		await fs.rm(root, { recursive: true, force: true });
		await fs.rm(source, { recursive: true, force: true });
	});

	it('imports standard Agent Skills from a project .agents skills folder', async () => {
		const root = await makeTempDir();
		const source = await makeTempDir();
		const skillDir = path.join(source, '.agents', 'skills', 'project-skill');
		await fs.mkdir(skillDir, { recursive: true });
		await fs.writeFile(
			path.join(skillDir, 'SKILL.md'),
			[
				'---',
				'name: project-skill',
				'description: Handles project-level skill workflows when users import a repository folder.',
				'---',
				'Use this skill for project-scoped agent workflows.',
			].join('\n')
		);
		const service = new SkillsService(makeLogger() as never, {
			userDataDirectory: userDataDirectory(root) as never,
		});

		const result = await service.importFromPath(source);

		expect(result.imported.map((skill) => skill.id)).toEqual(['project-skill']);
		await expect(fs.stat(path.join(root, 'skills', 'project-skill', 'SKILL.md'))).resolves.toBeDefined();
		await fs.rm(root, { recursive: true, force: true });
		await fs.rm(source, { recursive: true, force: true });
	});

	it('does not import container skills through a symlink escape', async () => {
		const root = await makeTempDir();
		const source = await makeTempDir();
		const outside = await makeTempDir();
		const outsideSkill = path.join(outside, 'escaped-skill');
		await fs.mkdir(outsideSkill, { recursive: true });
		await fs.writeFile(
			path.join(outsideSkill, 'SKILL.md'),
			[
				'---',
				'name: escaped-skill',
				'description: Handles escaped skill workflows outside of the selected import folder.',
				'---',
				'This should not be imported through a symlinked skills folder.',
			].join('\n')
		);
		await fs.symlink(outside, path.join(source, 'skills'), 'dir');
		const service = new SkillsService(makeLogger() as never, {
			userDataDirectory: userDataDirectory(root) as never,
		});

		await expect(service.importFromPath(source)).rejects.toThrow(
			'Selected folder must contain SKILL.md or skill subfolders with SKILL.md.'
		);
		await fs.rm(root, { recursive: true, force: true });
		await fs.rm(source, { recursive: true, force: true });
		await fs.rm(outside, { recursive: true, force: true });
	});

	it('activates trusted Agent Skill packages as structured instructions', async () => {
		const root = await makeTempDir();
		const dir = path.join(root, 'support-replies');
		await fs.mkdir(path.join(dir, 'references'), { recursive: true });
		await fs.writeFile(
			path.join(dir, 'SKILL.md'),
			[
				'---',
				'name: support-replies',
				'description: Draft support replies when users ask for help with account issues.',
				'compatibility: Requires access to the support policy reference.',
				'allowed-tools: Read',
				'---',
				'Use references/policy.md before drafting final copy.',
			].join('\n')
		);
		await fs.writeFile(path.join(dir, 'references', 'policy.md'), 'Policy details.');

		const loaded = await new SkillLoader().loadPackage(dir, { trusted: true });
		const registry = setupRegistry(false);
		registry.registerSkill(loaded.skill);
		const { engine } = setupEngine(registry);
		const result = await engine.execute({
			skillId: 'support-replies',
			input: {},
			context: executionContext(),
		});

		expect(result.success).toBe(true);
		expect(result.data).toMatchObject({
			name: 'support-replies',
			path: path.join(dir, 'SKILL.md'),
			resources: ['references/policy.md'],
		});
		await fs.rm(root, { recursive: true, force: true });
	});

	it('rejects Agent Skill packages without exactly one root SKILL.md', async () => {
		const root = await makeTempDir();
		const dir = path.join(root, 'broken-skill');
		await fs.mkdir(path.join(dir, 'nested'), { recursive: true });
		await fs.writeFile(
			path.join(dir, 'SKILL.md'),
			['---', 'name: broken-skill', 'description: Broken package.', '---', 'Body'].join('\n')
		);
		await fs.writeFile(
			path.join(dir, 'nested', 'skill.md'),
			['---', 'name: nested-skill', 'description: Extra package.', '---', 'Body'].join('\n')
		);

		await expect(new SkillLoader().loadPackage(dir)).rejects.toThrow('exactly one SKILL.md');
		await fs.rm(root, { recursive: true, force: true });
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
