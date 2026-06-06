# Agent Model Usage

The `src/main/agent_v2/model` package exposes one public module: `AgentModel`.
Import it from the package barrel, not from internal files.

```ts
import { AgentModel } from '';

const model = new AgentModel();

const response = await model.generate({
	provider: {
		id: 'openai',
		apiKey,
		baseURL,
	},
	model: 'gpt-5',
	maxTokens: 1024,
	system: 'Answer clearly.',
	messages: [{ role: 'user', content: 'Summarize the current task.' }],
});

console.log(response.content);
```

`response.content` contains the completed assistant text.

Do not import provider adapters, transcript entries, usage types, or other
low-level exports from `src/main/llm/types` inside `agent_v2/model` callers.
Do not construct `LlmService` when using `AgentModel`; `AgentModel` owns the LLM
service and the translation from simple model messages to the service stream
request.
