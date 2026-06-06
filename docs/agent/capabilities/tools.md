# Agent Tool Usage

Initialize `Tools` and get the available tools.

```ts
import { Tools } from '../../../src/main/agent_v2/capabilities/tools';

const tools = new Tools();
const availableTools = tools.getTools();

console.log(availableTools);
```

`getTools()` returns the tool names and descriptions used by the agent prompt
layer. Tool execution is handled later by the agent layer that receives model
tool calls.
