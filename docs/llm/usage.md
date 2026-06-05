# LLM Service Usage

`src/main/llm` exposes `LlmService` as the public entry point for main-process LLM provider access.

```ts
import { LlmService } from '../llm';

const llm = new LlmService();
const provider = llm.createProvider({
	id: 'openai',
	apiKey: process.env.OPENAI_API_KEY ?? '',
});

let text = '';

for await (const event of provider.stream({
	model: 'gpt-4.1',
	system: 'You are a concise assistant.',
	messages: [{ role: 'user', content: 'Summarize Friday in one sentence.' }],
	tools: [],
	maxTokens: 512,
})) {
	if (event.type === 'text_delta') {
		text += event.text;
	}
}

console.log(text);
```

In bootstrapped main-process code, prefer the registered service:

```ts
const llm = container.get('llm');
const provider = llm.createProvider({
	id: providerId,
	apiKey,
	baseURL,
});
```

Provider-specific adapter files stay internal to `src/main/llm`; callers should use `LlmService` instead of importing adapters directly.
