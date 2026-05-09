import { Tool } from '../../base.js';
import type { StoreService } from '../../../../store';
import { format, safeTelegram } from '../utils';

export class GetTelegramChannelTool extends Tool {
	name = 'get_telegram_channel';
	description = 'Get the Telegram channel settings.';
	parameters = {
		type: 'object',
		properties: {},
		required: [],
	};

	constructor(private readonly store: StoreService) {
		super();
	}

	async execute(_args: Record<string, unknown>): Promise<string> {
		return format(safeTelegram(this.store.getTelegramChannel()));
	}
}
