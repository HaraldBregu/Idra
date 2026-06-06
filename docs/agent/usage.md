```ts
const agent = new Agent();
const prompt = 'Input message';

const run = agent.run(prompt);

setTimeout(() => {
	run.stop();
}, 10_000);

for await (const event of run.stream) {
	switch (event.type) {
		case 'model_call_start':
			console.log('model started', event.model);
			break;

		case 'model_call_delta':
			process.stdout.write(event.delta);
			break;

		case 'model_call_end':
			console.log('model finished', event.usage);
			break;

		case 'tool_call_start':
			console.log('tool started', event.toolName, event.input);
			break;

		case 'tool_call_delta':
			console.log('tool update', event.delta);
			break;

		case 'tool_call_end':
			console.log('tool finished', event.output);
			break;

		case 'skill_call_start':
			console.log('skill started', event.skillName, event.input);
			break;

		case 'skill_call_delta':
			console.log('skill update', event.delta);
			break;

		case 'skill_call_end':
			console.log('skill finished', event.output);
			break;

		case 'run_finished':
			console.log('agent finished', event.result);
			break;

		case 'run_stopped':
			console.log('agent stopped', event.reason);
			break;
	}
}
```
