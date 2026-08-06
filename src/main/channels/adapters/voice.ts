import type { Bot } from 'grammy';

export function registerVoiceHandler(bot: Bot): void {
	bot.on('message:voice', () => {
		console.log('[telegram] voice message received');
	});
}
