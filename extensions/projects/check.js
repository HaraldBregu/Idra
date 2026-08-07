// Self-check for the extension's SDK seam: a stub Friday API replays the events a real
// agent run emits, so the tool-result and permission plumbing is verified without a model.
// Run against a real app instead with: node check.js <path-to-sdk-token> [url]
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { connected, projects, useRemote } from './src/lib/projects.js';

const [tokenPath, url] = process.argv.slice(2);

if (tokenPath) {
	console.log('ping:', await useRemote({ token: readFileSync(tokenPath, 'utf8').trim(), url }));
	console.log(
		'projects:',
		await projects.list({ onState: (state) => console.log('state:', state) })
	);
	process.exit(0);
}

const SAMPLE = [{ name: 'atlas', title: 'Atlas', description: 'Mapping work' }];

let stream;
const sent = [];

const server = createServer(async (req, res) => {
	if (req.url === '/health') {
		res.writeHead(200, { 'content-type': 'application/json' });
		res.end(JSON.stringify({ name: 'friday', version: 'stub' }));
		return;
	}
	if (req.url === '/events') {
		res.writeHead(200, { 'content-type': 'text/event-stream' });
		res.write(': connected\n\n');
		stream = res;
		return;
	}

	const chunks = [];
	for await (const chunk of req) chunks.push(chunk);
	const { channel, args } = JSON.parse(Buffer.concat(chunks).toString());
	sent.push({ channel, args });

	if (channel === 'agent:send') {
		const { runId, toolsAllow } = args[1];
		const emit = (event) =>
			stream.write(
				`data: ${JSON.stringify({ channel: 'agent:response', data: { runId, ...event } })}\n\n`
			);

		emit({ type: 'run_state', state: 'using_tools' });
		if (toolsAllow[0] === 'delete_project') {
			emit({ type: 'tool_permission_request', toolCallId: 'call-1', toolName: 'delete_project' });
			await new Promise((resolve) => setTimeout(resolve, 150));
		}
		emit({
			type: 'tool_call_result',
			toolName: toolsAllow[0],
			status: 'ok',
			output: { projects: SAMPLE },
		});
		emit({ type: 'run_state', state: 'completed' });
		await new Promise((resolve) => setTimeout(resolve, 50));
	}

	res.writeHead(200, { 'content-type': 'application/json' });
	res.end(JSON.stringify({ success: true, data: 'done' }));
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

assert.equal(connected(), false);
await assert.rejects(projects.list(), /Not connected to Friday/);

await useRemote({ token: 'stub', url: `http://127.0.0.1:${server.address().port}` });
assert.equal(connected(), true);

// structured tool output is read off the event stream, not parsed from prose
const states = [];
assert.deepEqual(await projects.list({ onState: (state) => states.push(state) }), SAMPLE);
assert.deepEqual(states, ['using_tools', 'completed']);
assert.equal(sent.at(-1).channel, 'agent:send');
assert.deepEqual(sent.at(-1).args[1].toolsAllow, ['list_projects']);

// each action runs one turn restricted to its own tool
await projects.create('atlas', 'Mapping work');
assert.deepEqual(sent.at(-1).args[1].toolsAllow, ['create_project']);
await projects.update('atlas', 'Mapping everything');
assert.deepEqual(sent.at(-1).args[1].toolsAllow, ['update_project']);

// delete asks first; approving goes back over the same connection
let asked;
await projects.remove('atlas', {
	onPermission: (event, respond) => {
		asked = event.toolName;
		respond('approve');
	},
});
assert.equal(asked, 'delete_project');
assert.deepEqual(
	sent.map((call) => call.channel).filter((channel) => channel.includes('permission')),
	['agent:respond-tool-permission']
);

server.close();
stream?.end();
console.log('projects extension check ok');
