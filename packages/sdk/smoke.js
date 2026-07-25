import assert from 'node:assert/strict';
import { agent, image, isFriday } from './dist/packages/sdk/index.js';

assert.equal(isFriday(), false);
assert.throws(() => image.createImage, /must run inside the Friday app/);

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

console.log('sdk smoke ok');
