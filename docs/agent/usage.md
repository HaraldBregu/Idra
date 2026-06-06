```ts
import { Agent } from '../../src/main/agent_v2';

const agent = new Agent();
const prompt = 'Input message';

const run = agent.run(prompt);

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
			console.log('tool input', {
				toolName: event.toolName,
				input: event.input,
			});
			break;

		case 'tool_call_end':
			console.log('tool output', {
				toolName: event.toolName,
				output: event.output,
			});
			break;

		case 'skill_call_start':
			console.log('skill input', {
				skillName: event.skillName,
				input: event.input,
			});
			break;

		case 'skill_call_end':
			console.log('skill output', {
				skillName: event.skillName,
				output: event.output,
			});
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
