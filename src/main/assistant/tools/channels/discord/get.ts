import { Tool } from '../../base.js';
import type { StoreService } from '../../../../store';
import { format, safeDiscord } from '../utils';

export class GetDiscordChannelTool extends Tool {
	name = 'get_discord_channel';
	description = 'Get the Discord channel settings.';
	parameters = {
		type: 'object',
		properties: {},
		required: [],
	};

	constructor(private readonly store: StoreService) {
		super();
	}

	async execute(_args: Record<string, unknown>): Promise<string> {
		return format(safeDiscord(this.store.getDiscordChannel()));
	}
}
