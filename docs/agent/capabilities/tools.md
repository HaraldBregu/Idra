# Agent Tool Usage

Tools are exposed to the agent as named capabilities. Initialize the tool
capability module and get the available tools.

```ts
import { AgentTools } from '../../../src/main/agent_v2/capabilities/tools';

const toolCapabilities = new AgentTools();
const tools = toolCapabilities.getTools();

console.log(tools);
```

`getTools()` returns the tool names and descriptions used by the agent prompt
layer. Tool execution is handled later by the agent layer that receives model
tool calls.
