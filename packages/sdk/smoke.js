import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { agent, connect, isFriday, models } from './dist/packages/sdk/index.js';

// --- embedded mode: bound to the app's preload globals ----------------------

assert.equal(isFriday(), false);
assert.throws(() => models.image, /must run inside the Friday app/);

globalThis.agent = {
	sent: [],
	async send(message) {
		this.sent.push(message);
		return 'ok';
	},
};

assert.equal(isFriday(), true);
assert.equal(await agent.send('hi'), 'ok');
assert.deepEqual(globalThis.agent.sent, ['hi']);

// --- remote mode: bound to the app's API server -----------------------------

const calls = [];
let stream;

const server = createServer(async (req, res) => {
	assert.equal(req.headers.authorization, 'Bearer secret');
	if (req.url === '/health') {
		res.writeHead(200, { 'content-type': 'application/json' });
		res.end(JSON.stringify({ name: 'friday', version: '1.0.0' }));
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
	calls.push({ channel, args });
	res.writeHead(200, { 'content-type': 'application/json' });
	res.end(JSON.stringify({ success: true, data: args[0] ?? null }));
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const friday = connect({ url: `http://127.0.0.1:${server.address().port}`, token: 'secret' });

assert.deepEqual(await friday.ping(), { name: 'friday', version: '1.0.0' });

// method names map onto the app's channels, including the aliased ones
await friday.models.image.createImage({ prompt: 'x' });
await friday.agent.getLastMessages('session-1');
await friday.agent.healthGetSettings();
assert.deepEqual(
	calls.map((call) => call.channel),
	['image:create-image', 'agent:last-messages', 'agent:health:settings']
);

// byte arrays survive the JSON hop in both directions
const bytes = new Uint8Array([0, 1, 2, 250, 255]);
assert.deepEqual(await friday.storage.getObject(bytes, 'key'), bytes);

// members that only exist inside a window are refused
const offRealtime = friday.models.transcribe.onRealtimeEvent(() => undefined);
offRealtime();

// events reach subscribers over the stream
const seen = [];
friday.app.onChannelsStatusChanged((event) => seen.push(event));
await new Promise((resolve) => setTimeout(resolve, 100));
stream.write(
	`data: ${JSON.stringify({ channel: 'app:channels:status-changed', data: { ok: 1 } })}\n\n`
);
await new Promise((resolve) => setTimeout(resolve, 100));
assert.deepEqual(seen, [{ ok: 1 }]);

friday.close();
server.close();
stream?.end();

console.log('sdk smoke ok');
