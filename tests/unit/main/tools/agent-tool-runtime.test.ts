import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createToolDiagnostics, getToolMetadata, markClientTool, markCoreTool, setToolMetadata, type AgentTool } from '../../../../src/main/tools/common';
import { textResult, jsonResult, blockedToolResult } from '../../../../src/main/tools/results';
import {
	asParamsRecord,
	coerceJsonObject,
	readBooleanParam,
	readEnumParam,
	readNumberParam,
	readStringArrayParam,
	readStringParam,
} from '../../../../src/main/tools/params';
import { createReadTool } from '../../../../src/main/tools/builtins/read-tool';
import { createExecTool } from '../../../../src/main/tools/builtins/exec-tool';
import { planToolConstruction, createAgentTools } from '../../../../src/main/tools/create-agent-tools';
import { applyToolPolicyPipeline } from '../../../../src/main/tools/tool-policy-pipeline';
import { normalizeToolSchemas } from '../../../../src/main/tools/schema-normalization';
import { wrapToolWithBeforeToolCall, newCallTracker } from '../../../../src/main/tools/before-tool-call';
import { toToolDefinitions } from '../../../../src/main/tools/tool-definition-adapter';
import { PluginToolRegistry } from '../../../../src/main/plugins/tool-registry';
import { safeMcpToolName, materializeMcpTools, normalizeMcpResult } from '../../../../src/main/tools/external/mcp-tools';
import { materializeLspTools } from '../../../../src/main/tools/external/lsp-tools';
import { applyToolSearchCompaction } from '../../../../src/main/tools/tool-search';
import { applyProviderSafeToolNames, prepareLegacyToolsForProvider } from '../../../../src/main/tools/runtime/legacy-tool-adapter';
import { canonicalResultToLegacy, canonicalToolToLegacy, legacyResultToCanonical, legacyToolToCanonical } from '../../../../src/main/tools/runtime/legacy-bridge';
import type { AgentTool as LegacyAgentTool, ToolContext } from '../../../../src/main/tools/types';
import { makeTempDir } from '../test-helpers';

function tool(name: string, overrides: Partial<AgentTool> = {}): AgentTool {
	return markCoreTool({
		name,
		description: `${name} description`,
		parameters: { type: 'object', properties: {}, additionalProperties: false },
		execute: jest.fn(async () => textResult(`${name} ok`, { name })),
		...overrides,
	});
}

describe('canonical agent tool runtime', () => {
	it('creates structured tool results', () => {
		expect(textResult('ok', { id: 1 })).toEqual({ content: [{ type: 'text', text: 'ok' }], details: { id: 1 } });
		expect(jsonResult({ ok: true }).content[0]).toEqual({ type: 'text', text: '{\n  "ok": true\n}' });
		expect(blockedToolResult({ reason: 'no' }).details).toMatchObject({ status: 'blocked', reason: 'no' });
	});

	it('coerces and validates untrusted params defensively', () => {
		const params = coerceJsonObject('{"s":" hi ","n":"3","b":"true","a":["x"],"e":"one"}');
		expect(asParamsRecord(params)).toBe(params);
		expect(readStringParam(params, 's')).toBe('hi');
		expect(readNumberParam(params, 'n', { integer: true })).toBe(3);
		expect(readBooleanParam(params, 'b')).toBe(true);
		expect(readStringArrayParam(params, 'a')).toEqual(['x']);
		expect(readEnumParam(params, 'e', ['one', 'two'] as const)).toBe('one');
		expect(() => readStringParam(params, 'missing', { required: true })).toThrow('Missing required parameter');
	});

	it('runs built-in read and exec tools', async () => {
		const workspace = await makeTempDir();
		await fs.writeFile(path.join(workspace, 'a.txt'), 'one\ntwo\n', 'utf8');
		const read = await createReadTool({ workspaceDir: workspace }).execute('tc1', { path: 'a.txt', limit: 1 });
		expect(read.content[0]?.text).toContain('one');

		const exec = await createExecTool({ workspaceDir: workspace }).execute('tc2', { command: 'printf hello' });
		expect(exec.details.exitCode).toBe(0);
		expect(exec.content[0]?.text).toContain('hello');
		await fs.rm(workspace, { recursive: true, force: true });
	});

	it('plans construction for default, empty, wildcard, narrow plugin, MCP, and LSP allowlists', () => {
		expect(planToolConstruction()).toMatchObject({ includeFileTools: true, includeShellTools: true });
		expect(planToolConstruction([])).toEqual(expect.objectContaining({ includeFileTools: false, includePluginTools: false }));
		expect(planToolConstruction(['*'])).toEqual(expect.objectContaining({ includeMcpTools: true, includeLspTools: true }));
		expect(planToolConstruction(['plugin_tool']).includePluginTools).toBe(true);
		expect(planToolConstruction(['group:mcp']).includeMcpTools).toBe(true);
		expect(planToolConstruction(['lsp_hover']).includeLspTools).toBe(true);
	});

	it('applies layered profile policy, groups, plugin id expansion, owner-only, sandbox, and runtime deny', () => {
		const pluginTool = tool('plugin_lookup');
		setToolMetadata(pluginTool, { ownerKind: 'plugin', pluginId: 'calendar' });
		const ownerOnly = tool('owner_secret', { ownerOnly: true });
		const tools = [tool('read'), tool('exec'), pluginTool, ownerOnly];
		const diagnostics = createToolDiagnostics();
		const result = applyToolPolicyPipeline(tools, {
			sender: { isOwner: false },
			diagnostics,
			stages: {
				profile: { allow: ['group:file', 'calendar', 'owner_secret'] },
				sandbox: { deny: ['exec'] },
				runtime: { deny: ['plugin_lookup'] },
			},
		});
		expect(result.tools.map((entry) => entry.name)).toEqual(['read']);
		expect(diagnostics.filteredTools.map((entry) => entry.stage)).toEqual(expect.arrayContaining(['ownerOnly', 'runtime']));
	});

	it('does not let fs config grant tools and applies deny after profile grants', () => {
		const tools = [tool('read'), tool('write'), tool('edit'), tool('apply_patch'), tool('exec')];
		expect(applyToolPolicyPipeline(tools, {
			stages: {
				global: { fs: { workspaceOnly: false } },
			},
		}).tools.map((entry) => entry.name)).toEqual(tools.map((entry) => entry.name));
		expect(applyToolPolicyPipeline(tools, {
			stages: {
				global: { profile: 'coding', deny: ['write', 'edit', 'apply_patch'] },
			},
		}).tools.map((entry) => entry.name)).toEqual(['read', 'exec']);
		expect(applyToolPolicyPipeline(tools, {
			stages: {
				global: { profile: 'minimal', alsoAllow: ['read'], deny: ['read'] },
			},
		}).tools.map((entry) => entry.name)).toEqual([]);
	});

	it('normalizes provider schemas while preserving metadata', () => {
		const base = tool('schema_tool', {
			parameters: {
				$schema: 'https://json-schema.org/draft/2020-12/schema',
				type: 'object',
				properties: {},
				patternProperties: { x: { type: 'string' } },
			},
		});
		const [normalized] = normalizeToolSchemas([base], { provider: 'openai' });
		expect((normalized!.parameters as Record<string, unknown>).$schema).toBeUndefined();
		expect((normalized!.parameters as Record<string, unknown>).patternProperties).toBeUndefined();
	});

	it('applies provider-safe aliases with collision suffixes and preserved metadata', () => {
		const diagnostics = createToolDiagnostics();
		const first = setToolMetadata(tool('Bad Tool!'), { ownerKind: 'plugin', pluginId: 'demo' });
		const second = setToolMetadata(tool('bad tool'), { ownerKind: 'mcp', serverId: 'repo', declaredName: 'bad tool' });

		const renamed = applyProviderSafeToolNames([first, second], {
			diagnostics,
			maxNameLength: 12,
		});

		expect(renamed.map((entry) => entry.name)).toEqual(['bad_tool', 'bad_tool_2']);
		expect(renamed[0]?.label).toBe('Bad Tool!');
		expect(renamed[0]?.description).toContain('Provider-safe alias for Bad Tool!');
		expect(getToolMetadata(renamed[0]!)).toEqual({ ownerKind: 'plugin', pluginId: 'demo' });
		expect(getToolMetadata(renamed[1]!)).toEqual({
			ownerKind: 'mcp',
			serverId: 'repo',
			declaredName: 'bad tool',
		});
		expect(diagnostics.warnings).toEqual([
			'Bad Tool!: exposed to provider as bad_tool',
			'bad tool: exposed to provider as bad_tool_2',
		]);
	});

	it('prepares legacy tools for providers while keeping execution on the original tool', async () => {
		const toolContext = {
			workspace: '/workspace',
			sessionId: 'session-1',
			readState: new Map(),
			plan: { entries: [] },
			approvalRequired: new Set(),
			approvalCache: new Set(),
			services: {} as never,
		} as ToolContext;
		const execute = jest.fn(async () => ({
			status: 'ok' as const,
			content: [{ type: 'image' as const, base64: 'aW1n', mimeType: 'image/png' }],
			details: { ok: true },
		}));
		const legacyTool: LegacyAgentTool = {
			name: 'Screen Capture!',
			description: 'Capture the screen.',
			schema: {
				$schema: 'https://json-schema.org/draft/2020-12/schema',
				type: 'object',
				properties: { id: { type: 'string' } },
				patternProperties: { '^x-': { type: 'string' } },
			},
			execute,
		};

		const [prepared] = prepareLegacyToolsForProvider([legacyTool], toolContext, {
			provider: 'openai',
			modelId: 'gpt-test',
		});
		const result = await prepared!.execute({ id: 'shot-1' }, toolContext);

		expect(prepared).toMatchObject({
			name: 'screen_capture',
			description: expect.stringContaining('Provider-safe alias for Screen Capture!'),
			schema: {
				type: 'object',
				properties: { id: { type: 'string' } },
				required: [],
			},
		});
		expect(execute).toHaveBeenCalledWith(
			{ id: 'shot-1' },
			expect.objectContaining({ sessionId: 'session-1' })
		);
		expect(result).toEqual({
			status: 'ok',
			content: [{ type: 'image', base64: 'aW1n', mimeType: 'image/png' }],
			details: { ok: true },
		});
	});

	it('converts image content between legacy and canonical result shapes', () => {
		const canonical = legacyResultToCanonical({
			status: 'ok',
			content: [{ type: 'image', base64: 'aW1n', mimeType: 'image/png' }],
		});

		expect(canonical).toEqual({
			content: [{ type: 'image', data: 'aW1n', mimeType: 'image/png' }],
			details: undefined,
		});
		expect(canonicalResultToLegacy(canonical)).toEqual({
			status: 'ok',
			content: [{ type: 'image', base64: 'aW1n', mimeType: 'image/png' }],
			details: undefined,
		});
	});

	it('wraps execution with veto, hook param adjustment, loop detection, diagnostics, and error conversion', async () => {
		const diagnostics = createToolDiagnostics();
		const execute = jest.fn(async (_id, params) => textResult('done', params));
		const approval = jest.fn(async () => 'allow-once' as const);
		const wrapped = wrapToolWithBeforeToolCall(tool('wrapped', { execute }), {
			diagnostics,
			approvalRequired: new Set(['wrapped']),
			approval,
			beforeToolCallHooks: [({ params }) => ({ params: { ...(params as Record<string, unknown>), adjusted: true } })],
			loopDetector: newCallTracker(),
			loopStopAt: 2,
		});
		const first = await wrapped.execute('tc1', { a: 1 });
		expect(first.details).toEqual({ a: 1, adjusted: true });
		expect(approval).not.toHaveBeenCalled();
		expect(execute).toHaveBeenCalledWith('tc1', { a: 1, adjusted: true }, undefined, expect.any(Function));
		await wrapped.execute('tc2', { a: 1 });
		const blocked = await wrapped.execute('tc3', { a: 1 });
		expect(blocked.details).toMatchObject({ status: 'blocked', deniedReason: 'loop_detected' });
		expect(diagnostics.events.map((event) => event.type)).toEqual(expect.arrayContaining(['tool.execution.started', 'tool.execution.completed']));

		const vetoed = await wrapToolWithBeforeToolCall(tool('vetoed'), {
			beforeToolCallHooks: [() => ({ allow: false, reason: 'blocked by test' })],
		}).execute('tc4', {});
		expect(vetoed.content[0]?.text).toContain('blocked by test');
	});

	it('resolves tool hook approval requests through the approval callback', async () => {
		const execute = jest.fn(async (_id, params) => textResult('done', params));
		const onResolution = jest.fn();
		const approval = jest.fn(async () => 'allow-once' as const);
		const wrapped = wrapToolWithBeforeToolCall(tool('plugin_action', { execute }), {
			runId: 'run-1',
			approval,
			beforeToolCallHooks: [
				() => ({
					requireApproval: {
						title: 'Approve plugin action',
						description: 'Plugin wants to write data.',
						pluginId: 'demo',
						allowedDecisions: ['allow-once', 'deny'],
						onResolution,
					},
				}),
			],
		});

		const allowed = await wrapped.execute('tc-plugin', { value: 1 });

		expect(allowed.details).toEqual({ value: 1 });
		expect(approval).toHaveBeenCalledWith(
			expect.objectContaining({
				toolName: 'plugin_action',
				toolCallId: 'tc-plugin',
				runId: 'run-1',
				paramsPreview: { value: 1 },
			})
		);
		expect(onResolution).toHaveBeenCalledWith('allow-once');

		const deniedResolution = jest.fn();
		const denied = await wrapToolWithBeforeToolCall(tool('plugin_denied', { execute }), {
			approval: jest.fn(async () => 'deny' as const),
			beforeToolCallHooks: [
				() => ({
					requireApproval: {
						title: 'Approve plugin action',
						description: 'Plugin wants to write data.',
						onResolution: deniedResolution,
					},
				}),
				],
			}).execute('tc-denied', {});
		expect(denied.details).toMatchObject({ status: 'blocked', deniedReason: 'approval_denied' });
		expect(deniedResolution).toHaveBeenCalledWith('deny');
	});

	it('adapts tools to model definitions and returns structured errors and client pending results', async () => {
		const badParams = toToolDefinitions([tool('needs_object')])[0]!;
		const invalid = await badParams.execute('tc1', '{bad json');
		expect(invalid.details).toMatchObject({ status: 'input_error' });

		const client = markClientTool(tool('client_pick_file'), 'ui');
		const pending = await toToolDefinitions([client])[0]!.execute('tc2', {});
		expect(pending.details).toMatchObject({ status: 'pending', tool: 'client_pick_file' });
		expect(pending.terminate).toBe(true);
	});

	it('propagates abort signals and converts execution throws into tool results', async () => {
		const controller = new AbortController();
		const execute = jest.fn(async (_id, _params, signal) => {
			expect(signal).toBe(controller.signal);
			throw new Error('boom');
		});
		const definition = toToolDefinitions([tool('throws', { execute })], { signal: controller.signal })[0]!;
		const result = await definition.execute('tc1', {});
		expect(result.details).toMatchObject({ status: 'error', toolName: 'throws', message: 'boom' });
	});

	it('resolves plugin tools with optional filtering, conflict detection, and undeclared rejection', async () => {
		const registry = new PluginToolRegistry();
		registry.register({
			manifest: {
				id: 'demo',
				tools: [{ name: 'demo_default' }, { name: 'demo_optional', optional: true }],
			},
			factory: () => [tool('demo_default'), tool('demo_optional')],
		});
		await expect(registry.resolveTools({ context: {}, toolsAllow: ['demo_default'] })).resolves.toHaveLength(1);
		await expect(registry.resolveTools({ context: {}, toolsAllow: ['demo_optional'] })).resolves.toHaveLength(1);
		await expect(registry.resolveTools({ context: {}, existingToolNames: new Set(['demo_default']) })).rejects.toThrow('conflict');

		const bad = new PluginToolRegistry();
		bad.register({ manifest: { id: 'bad', tools: [{ name: 'declared' }] }, factory: () => tool('undeclared') });
		await expect(bad.resolveTools({ context: {}, toolsAllow: ['bad'] })).rejects.toThrow('undeclared');
	});

	it('materializes MCP and LSP tools with safe names and normalized results', async () => {
		expect(safeMcpToolName('My Server', 'Read File')).toBe('mcp_my_server_read_file');
		expect(normalizeMcpResult({ ok: true }).details).toEqual({ ok: true });
		const mcp = await materializeMcpTools({
			context: {},
			runtime: {
				listTools: async () => [
					{ serverId: 'repo', name: 'search', description: 'Search repo', parameters: { type: 'object' } },
				],
				callTool: async () => 'mcp ok',
			},
		});
		expect(mcp[0]?.name).toBe('mcp_repo_search');
		await expect(mcp[0]!.execute('tc', {})).resolves.toMatchObject({ details: 'mcp ok' });

		const lsp = await materializeLspTools({
			runtime: {
				capabilities: ['hover'],
				hover: async () => ({ value: 'hover' }),
			},
		});
		expect(lsp.map((entry) => entry.name)).toEqual(['lsp_hover']);
	});

	it('compacts large catalogs behind search, describe, and call controls without changing execution semantics', async () => {
		const hidden = tool('hidden_weather', { description: 'Fetch weather forecast' });
		const compacted = applyToolSearchCompaction([tool('read'), hidden], {
			enabled: true,
			threshold: 1,
			visibleTools: ['read'],
		});
		expect(compacted.tools.map((entry) => entry.name)).toEqual(['read', 'tool_search', 'tool_describe', 'tool_call']);
		const search = compacted.tools.find((entry) => entry.name === 'tool_search')!;
		await expect(search.execute('tc1', { query: 'weather' })).resolves.toMatchObject({
			details: { matches: [expect.objectContaining({ name: 'hidden_weather' })] },
		});
		const call = compacted.tools.find((entry) => entry.name === 'tool_call')!;
		await expect(call.execute('tc2', { name: 'hidden_weather', args: {} })).resolves.toMatchObject({
			details: { name: 'hidden_weather' },
		});
	});

	it('assembles a run-scoped tool set and keeps narrow allowlists from materializing plugins, MCP, or LSP', async () => {
		const workspace = await makeTempDir();
		const registry = new PluginToolRegistry();
		const pluginFactory = jest.fn(() => tool('plugin_tool'));
		registry.register({ manifest: { id: 'demo', tools: [{ name: 'plugin_tool' }] }, factory: pluginFactory });
		const result = await createAgentTools({
			workspaceDir: workspace,
			toolsAllow: ['read'],
			pluginRegistry: registry,
			mcpRuntime: { listTools: jest.fn(), callTool: jest.fn() },
			lspRuntime: { capabilities: ['hover'], hover: jest.fn() },
		});
		expect(result.tools.map((entry) => entry.name)).toEqual(['read']);
		expect(pluginFactory).not.toHaveBeenCalled();
		expect(result.diagnostics.builtTools).toContain('read');
		await fs.rm(workspace, { recursive: true, force: true });
	});

	it('accepts host tools without materializing duplicate built-ins', async () => {
		const workspace = await makeTempDir();
		const result = await createAgentTools({
			workspaceDir: workspace,
			includeCoreTools: false,
			hostTools: [tool('host_lookup')],
		});
		expect(result.tools.map((entry) => entry.name)).toEqual(['host_lookup']);
		await fs.rm(workspace, { recursive: true, force: true });
	});

	it('round-trips legacy host tools through the canonical runtime shape', async () => {
		const toolContext = {
			workspace: '/workspace',
			sessionId: 'session-1',
			readState: new Map(),
			plan: { entries: [] },
			approvalRequired: new Set(),
			approvalCache: new Set(),
			services: {} as never,
		} as ToolContext;
		const legacyTool: LegacyAgentTool = {
			name: 'legacy_write',
			description: 'Legacy write tool.',
			schema: { type: 'object', properties: {}, additionalProperties: false },
			needsApproval: true,
			execute: jest.fn(async () => ({
				status: 'error',
				content: [{ type: 'text', text: 'blocked' }],
				details: { code: 'blocked' },
			})),
		};

		const canonical = legacyToolToCanonical(legacyTool, toolContext);
		const roundTripped = canonicalToolToLegacy(canonical);
		const result = await roundTripped.execute({ value: 1 }, toolContext);

		expect(roundTripped.needsApproval).toBe(true);
		expect(result.status).toBe('error');
		expect(result.details).toMatchObject({ status: 'error', code: 'blocked' });
		expect(legacyTool.execute).toHaveBeenCalledWith(
			{ value: 1 },
			expect.objectContaining({ sessionId: 'session-1' })
		);
	});

	it('passes fs workspace policy to built-in tools and removes write-capable tools in read-only sandboxes', async () => {
		const workspace = await makeTempDir();
		const outside = await makeTempDir();
		await fs.writeFile(path.join(outside, 'outside.txt'), 'outside', 'utf8');
		const fsOnly = await createAgentTools({
			workspaceDir: workspace,
			config: { tools: { fs: { workspaceOnly: false } } },
		});
		expect(fsOnly.tools).toEqual([]);

		const wide = await createAgentTools({
			workspaceDir: workspace,
			toolsAllow: ['read'],
			config: { tools: { fs: { workspaceOnly: false } } },
		});
		const read = wide.tools.find((entry) => entry.name === 'read')!;
		await expect(read.execute('tc-outside', { path: path.join(outside, 'outside.txt') })).resolves.toMatchObject({
			details: expect.objectContaining({ size: 7 }),
		});

		const sandboxed = await createAgentTools({
			workspaceDir: workspace,
			toolsAllow: ['read', 'write', 'edit', 'apply_patch'],
			clientTools: [tool('write'), tool('edit'), tool('apply_patch')],
			sandbox: { readOnly: true },
		});
		expect(sandboxed.tools.map((entry) => entry.name)).toEqual(['read']);
		await fs.rm(workspace, { recursive: true, force: true });
		await fs.rm(outside, { recursive: true, force: true });
	});

	it('fails closed when a client-hosted tool conflicts with a core tool name', async () => {
		const workspace = await makeTempDir();
		await expect(
			createAgentTools({
				workspaceDir: workspace,
				toolsAllow: ['*'],
				clientTools: [markClientTool(tool('read'), 'ui')],
			})
		).rejects.toThrow('tool name collision');
		await fs.rm(workspace, { recursive: true, force: true });
	});
});
