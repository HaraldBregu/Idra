# Agent Tool Usage

Tools are exposed to the agent as named capabilities. Initialize the tool
capability module, get the available tools, and pass them to the runtime.

```ts
import { AgentRuntime, type RuntimeToolCall } from '../../../src/main/agent_v2';
import { AgentTools } from '../../../src/main/agent_v2/capabilities/tools';

declare const model: ConstructorParameters<typeof AgentRuntime>[0];

const toolCapabilities = new AgentTools();
const tools = toolCapabilities.getTools();

const runtime = new AgentRuntime(model);
const result = await runtime.run({
	task: 'read-file',
	message: 'Read package.json and summarize the package name.',
	tools,
	model: 'gpt-5',
});

console.log(result.toolCalls satisfies RuntimeToolCall[]);
```

`getTools()` returns the tool names and descriptions that the runtime includes
in the prompt. Tool execution is handled by the next agent layer after the
runtime reports `result.toolCalls`.
