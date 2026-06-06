# Agent Tool Usage

Initialize `Tools` and get the available tools.

```ts
import { Tools } from '../../../src/main/agent_v2/capabilities/tools';

const tools = new Tools();
const availableTools = tools.getTools();

console.log(availableTools);
```

`getTools()` returns tool names and descriptions.
