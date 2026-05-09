import { Tool } from '../base.js';
import type { StoreService } from '../../../store';
import { format, safeChannel } from './utils';

export class GetChannelsTool extends Tool {
	name = 'get_channels';
	description = 'Get the configured messaging channel settings.';
	parameters = {
		type: 'object',
		properties: {},
		required: [],
	};

	constructor(private readonly store: StoreService) {
		super();
	}

	async execute(_args: Record<string, unknown>): Promise<string> {
		return format(
			safeChannel({
				telegram: this.store.getTelegramChannel(),
				whatsapp: this.store.getWhatsappChannel(),
				discord: this.store.getDiscordChannel(),
			})
		);
	}
}
