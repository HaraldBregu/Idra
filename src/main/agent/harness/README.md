# Friday Agent Harness

Production-grade, UI-independent runtime for LLM agents in `src/main/agent/harness`.

## Public API

```ts
import {
	createAgentHarness,
	InMemoryAgentHarnessMemory,
} from './harness';

const harness = await createAgentHarness({
	modelId: 'gpt-5.4-mini',
	model: providerAdapter,
	tools: nativeTools,
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

## Evals

Use `runAgentHarnessEvals(harness, fixtures)` for deterministic scenario tests. Fixtures can match expected text or provide a custom scorer over the final result and emitted events.
