# Friday Agent Harness

Production-grade, UI-independent runtime for LLM agents in `src/main/agent/harness`.

## Public API

```ts
import {
	createAgentHarness,
	InMemoryAgentHarnessMemory,
	McpAgentHarnessToolProvider,
} from './harness';

const harness = await createAgentHarness({
	modelId: 'gpt-5.4-mini',
	model: providerAdapter,
	tools: nativeTools,
	externalTools: [new McpAgentHarnessToolProvider(mcpServers)],
	memory: new InMemoryAgentHarnessMemory(),
	runtime: {
		maxIterations: 25,
		maxTokens: 4096,
		maxCostUsd: 0.25,
		toolTimeoutMs: 30_000,
	},
});

for await (const event of harness.stream({ task: 'Research and summarize.' })) {
	render(event);
}
```

## Configuration

- `modelId`, `model`: required provider-neutral adapter.
- `models.registry`: optional model capabilities, context window, and cost metadata.
- `models.fallbacks`, `models.retry`: alternate model/provider routing and transient retry behavior.
- `tools`, `toolRegistry`, `externalTools`: native and discovered tools.
- `permissions`: allow/deny lists plus default approval gates for destructive or external-write tools.
- `context`: pluggable context assembly. `BudgetedAgentHarnessContextManager` is provided.
- `memory`, `persistence`: replaceable short/long-term state stores.
- `skills`: progressive skill discovery and loading.
- `approvals`, `safety`, `boundary`: HITL and guardrail hooks.
- `runtime`: ceilings for iterations, time, tokens, cost, and tool duration.

Secrets are loaded by adapters/connectors, redacted before logs, and never required in harness config files.

## MCP

```ts
new McpAgentHarnessToolProvider([
	{ name: 'filesystem', transport: 'stdio', command: 'node', args: ['server.js'] },
	{ name: 'remote', transport: 'http', url: 'https://example.com/mcp' },
]);
```

Discovered MCP tools are exposed as `server__tool` names and execute through the same validation, permission, timeout, approval, and event path as native tools.

## Example

`example.ts` creates an in-process MCP server, native tools, memory, an approval gate, a scripted model, and streams events:

```bash
yarn node --loader ts-node/esm src/main/agent/harness/example.ts
```

If the local repo does not have a TypeScript runtime loader installed, import and call `runAgentHarnessExample()` from an existing dev entry point.

## Evals

Use `runAgentHarnessEvals(harness, fixtures)` for deterministic scenario tests. Fixtures can match expected text or provide a custom scorer over the final result and emitted events.
