# Agent Model Usage

`src/main/agent_v2/model` is internal implementation for `Agent`.
Do not import it directly.

Use the public package root instead:

```ts
import { Agent } from '../../../src/main/agent_v2';

const agent = new Agent();
const run = agent.run('Summarize the current task.');

for await (const event of run.stream) {
	if (event.type === 'run_finished') {
		console.log(event.result.text);
	}
}
```
