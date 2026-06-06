# Agent Tool Usage

Initialize `Tools` and get the available tools.

```ts
const tools = new Tools();
const availableTools = tools.getTools();

console.log(availableTools);
```

`getTools()` returns tool names and descriptions.
