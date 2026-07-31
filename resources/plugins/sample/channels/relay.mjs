export default {
	id: 'relay',
	name: 'Relay',
	async onMessage(message, { forward }) {
		await forward(message.room === 'a' ? 'b' : 'a', message.text);
	},
};
