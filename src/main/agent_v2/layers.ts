import {
	computationalGuide,
	computationalSensor,
	inferentialGuide,
	inferentialSensor,
} from './controls';
import type { HarnessLayer } from './types';

export const harnessLayers: HarnessLayer[] = [
	{
		id: 'core',
		name: 'Stateless LLM Core',
		summary: 'The model receives tokens and returns text without durable state or direct I/O.',
		components: [
			{
				id: 'stateless_model',
				name: 'Model',
				summary: 'Token-in, token-out inference core wrapped by the harness.',
				controls: [inferentialGuide],
			},
		],
	},
	{
		id: 'runtime',
		name: 'Runtime',
		summary: 'Execution services that make model calls actionable and repeatable.',
		components: [
			{
				id: 'prompt_composer',
				name: 'Prompt Composer',
				summary: 'Builds the system prompt from identity, tools, policies, context, and memory.',
				controls: [inferentialGuide],
			},
			{
				id: 'agent_loop',
				name: 'Agent Loop',
				summary: 'Runs perceive, reason, act, and observe cycles until a stop condition.',
				controls: [inferentialGuide, computationalSensor],
			},
			{
				id: 'output_parser',
				name: 'Output Parser',
				summary: 'Validates model output and converts it into typed tool calls or final text.',
				controls: [computationalSensor],
			},
			{
				id: 'error_recovery',
				name: 'Error Recovery',
				summary: 'Handles malformed output, timeouts, retries, and targeted recovery messages.',
				controls: [computationalSensor, inferentialGuide],
			},
			{
				id: 'model_router',
				name: 'Model Router',
				summary: 'Assigns model roles for action, thinking, critique, vision, and compaction.',
				controls: [computationalGuide],
			},
		],
	},
	{
		id: 'capabilities',
		name: 'Capabilities',
		summary: 'Surfaces the runtime can use to interact with context, tools, and durable state.',
		components: [
			{
				id: 'tool_registry',
				name: 'Tool Registry',
				summary: 'Defines tools, schemas, descriptions, dispatch handlers, and result handling.',
				controls: [computationalGuide, computationalSensor],
			},
			{
				id: 'mcp_boundary',
				name: 'MCP Boundary',
				summary: 'Separates host, client, and server concerns for tools, resources, and prompts.',
				controls: [computationalGuide],
			},
			{
				id: 'skills',
				name: 'Skills',
				summary: 'Loads markdown capability packages on demand through progressive disclosure.',
				controls: [inferentialGuide],
			},
			{
				id: 'context_engineering',
				name: 'Context Engineering',
				summary: 'Curates high-signal tokens through retrieval, compaction, and offloading.',
				controls: [inferentialGuide, computationalSensor],
			},
			{
				id: 'memory',
				name: 'Memory',
				summary: 'Tracks working and episodic state outside raw model inference.',
				controls: [inferentialGuide],
			},
			{
				id: 'sessions',
				name: 'Sessions',
				summary: 'Persists conversation history, operation logs, and resumable run state.',
				controls: [computationalGuide],
			},
		],
	},
	{
		id: 'safety_scale',
		name: 'Safety And Scale',
		summary: 'Independent controls that constrain, verify, observe, and parallelize agent work.',
		components: [
			{
				id: 'guardrails',
				name: 'Guardrails',
				summary: 'Checks input, output, retrieval, execution, and dialog behavior.',
				controls: [computationalSensor, inferentialSensor],
			},
			{
				id: 'verification',
				name: 'Verification',
				summary: 'Feeds test, compiler, linter, screenshot, and judge results back into the loop.',
				controls: [computationalSensor, inferentialSensor],
			},
			{
				id: 'observability',
				name: 'Observability',
				summary: 'Records traces, spans, tool calls, guardrail checks, and trajectory quality.',
				controls: [computationalSensor],
			},
			{
				id: 'subagents',
				name: 'Subagents',
				summary: 'Uses orchestrator-worker fan-out with isolated context windows.',
				controls: [inferentialGuide, inferentialSensor],
			},
			{
				id: 'permissions',
				name: 'Permissions',
				summary: 'Scopes tools with deny, ask, and allow decisions enforced by the harness.',
				controls: [computationalGuide],
			},
			{
				id: 'sandbox',
				name: 'Sandbox',
				summary: 'Constrains filesystem and network access as an operating-system backstop.',
				controls: [computationalGuide],
			},
		],
	},
];
