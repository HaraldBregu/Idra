```ts
const agent = new Agent();
const prompt = 'prompt example';

const stream = agent.stream(prompt);

for await (const event of stream) {
	if (event.type === 'text_delta') {
		process.stdout.write(event.text);
	}
}
```
