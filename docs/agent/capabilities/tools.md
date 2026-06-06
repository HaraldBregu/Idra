# Agent Tool Usage

Tools are exposed to the agent as named capabilities. The runtime includes the
tool names and descriptions in the prompt, the model returns `toolCalls`, and
the caller dispatches those calls to the matching project tool implementation.

```ts
import { AgentRuntime, type RuntimeToolCall } from '../../../src/main/agent_v2';
import type { AgentTool } from '../../../src/main/tools/core/tool';

declare const model: ConstructorParameters<typeof AgentRuntime>[0];
declare const readFileTool: AgentTool<{ path: string }>;
declare const toolContext: Parameters<typeof readFileTool.execute>[1];

const tools = [
	{
		name: readFileTool.name,
		description: readFileTool.description,
	},
];

const runtime = new AgentRuntime(model);
const result = await runtime.run({
	task: 'read-file',
	message: 'Read package.json and summarize the package name.',
	tools,
	model: 'gpt-5',
});

const handlers = new Map([
	[
		readFileTool.name,
		(call: RuntimeToolCall) =>
			readFileTool.execute(call.args as { path: string }, toolContext),
	],
]);

for (const call of result.toolCalls) {
	const handler = handlers.get(call.name);
	if (!handler) throw new Error(`Unknown tool: ${call.name}`);

	const toolResult = await handler(call);
	console.log(toolResult.content);
}
```

The important boundary is that `AgentRuntime` decides what tool calls the model
requested. Tool execution stays outside the runtime so policies, approval,
workspace context, and result handling can be applied by the caller.
