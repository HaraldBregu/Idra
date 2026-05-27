import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import type { AgentHarnessModel, AgentHarnessTool } from './types';
import { createAgentHarness } from './runtime';
import { InMemoryAgentHarnessMemory } from './memory';
import { McpAgentHarnessToolProvider } from './mcp';

export async function runAgentHarnessExample(): Promise<void> {
	const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
	const server = new McpServer({ name: 'demo-mcp', version: '1.0.0' });
	server.registerTool(
		'echo',
		{
			description: 'Echo a short message from the MCP server.',
			inputSchema: { text: z.string() },
		},
		async ({ text }) => ({ content: [{ type: 'text', text: `mcp:${text}` }] })
	);
	await server.connect(serverTransport);

	const events: string[] = [];
	const model = createScriptedExampleModel();
	const tools: AgentHarnessTool[] = [
		{
			name: 'memory_note',
			description: 'Record a short working note.',
			schema: {
				type: 'object',
				properties: { note: { type: 'string' } },
				required: ['note'],
				additionalProperties: false,
			},
			execute: async (args) => ({
				status: 'ok',
				content: [{ type: 'text', text: `noted:${String(args.note)}` }],
			}),
		},
		{
			name: 'approval_tool',
			description: 'Demonstrates a human approval gate.',
			schema: {
				type: 'object',
				properties: { action: { type: 'string' } },
				required: ['action'],
				additionalProperties: false,
			},
			requiresApproval: true,
			destructive: true,
			execute: async (args) => ({
				status: 'ok',
				content: [{ type: 'text', text: `approved:${String(args.action)}` }],
			}),
		},
	];
	const mcp = new McpAgentHarnessToolProvider([
		{ name: 'demo', transport: 'custom', createTransport: () => clientTransport },
	]);
	const harness = await createAgentHarness({
		modelId: 'fake-harness-model',
		systemPrompt: 'You are running the Friday harness example.',
		model,
		tools,
		externalTools: [mcp],
		memory: new InMemoryAgentHarnessMemory(),
		approvals: { checkpoint: async () => ({ approved: true, reason: 'example approval' }) },
		events: { emit: (event) => events.push(event.type) },
		runtime: { maxIterations: 8, maxTokens: 1_000, toolTimeoutMs: 5_000 },
	});

	const result = await harness.execute({
		task: 'Demonstrate native tools, MCP, memory, approval, and streaming.',
		sessionId: 'example',
	});
	await mcp.close();
	await server.close();
	process.stdout.write(`${result.finalText}\n${events.join('\n')}\n`);
}

function createScriptedExampleModel(): AgentHarnessModel {
	return {
		async *stream(req) {
			const toolTurns = req.messages.filter((entry) => entry.role === 'tool').length;
			if (toolTurns === 0) {
				yield { type: 'tool_call_start' as const, id: 'native-1', name: 'memory_note' };
				yield {
					type: 'tool_call_args_delta' as const,
					id: 'native-1',
					jsonDelta: '{"note":"native tool completed"}',
				};
				yield { type: 'message_end' as const, stopReason: 'end_turn', usage: { inputTokens: 10, outputTokens: 5 } };
				return;
			}
			if (toolTurns === 1) {
				yield { type: 'tool_call_start' as const, id: 'mcp-1', name: 'demo__echo' };
				yield { type: 'tool_call_args_delta' as const, id: 'mcp-1', jsonDelta: '{"text":"hello"}' };
				yield { type: 'message_end' as const, stopReason: 'end_turn', usage: { inputTokens: 8, outputTokens: 4 } };
				return;
			}
			if (toolTurns === 2) {
				yield { type: 'tool_call_start' as const, id: 'approval-1', name: 'approval_tool' };
				yield { type: 'tool_call_args_delta' as const, id: 'approval-1', jsonDelta: '{"action":"external write"}' };
				yield { type: 'message_end' as const, stopReason: 'end_turn', usage: { inputTokens: 8, outputTokens: 4 } };
				return;
			}
			yield { type: 'text_delta' as const, text: 'Example complete: native tool, MCP tool, memory, approval, and events ran.' };
			yield { type: 'message_end' as const, stopReason: 'end_turn', usage: { inputTokens: 8, outputTokens: 10 } };
		},
	};
}

if (process.argv[1]?.endsWith('example.ts') || process.argv[1]?.endsWith('example.js')) {
	void runAgentHarnessExample();
}
