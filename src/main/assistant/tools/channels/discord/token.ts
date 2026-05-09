import { Tool } from '../../base.js';
import type { StoreService } from '../../../../store';
import { stringArg } from '../utils';

export class SetDiscordTokenTool extends Tool {
	name = 'set_discord_token';
	description = 'Set the Discord channel token.';
	parameters = {
		type: 'object',
		properties: {
			token: {
				type: 'string',
				description: 'The Discord bot token to store.',
			},
		},
		required: ['token'],
		additionalProperties: false,
	};

	constructor(private readonly store: StoreService) {
		super();
	}

	async execute(args: Record<string, unknown>): Promise<string> {
		const token = stringArg(args, ['token']);
		if (token === null) {
			return 'Error: token must be a string';
		}
		this.store.setDiscordToken(token);
		return 'Discord token saved.';
	}
}
