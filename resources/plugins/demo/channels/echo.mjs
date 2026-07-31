export default {
	id: 'echo',
	name: 'Echo',
	async onMessage(message, { reply }) {
		await reply(message.text);
	},
};
