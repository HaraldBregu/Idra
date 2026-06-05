# LLM Service Usage

`src/main/llm` exposes `LlmService` as the public entry point for main-process LLM provider access.

```ts
import { LlmService } from '../llm';

const llm = new LlmService();
const provider = llm.build({
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

Provider-specific adapter files stay internal to `src/main/llm`; callers should use `LlmService` instead of importing adapters directly.
