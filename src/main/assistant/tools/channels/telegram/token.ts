import { Tool } from '../../base.js';
import type { StoreService } from '../../../../store';
import { stringArg } from '../utils';

export class SetTelegramTokenTool extends Tool {
	name = 'set_telegram_token';
	description = 'Set the Telegram channel token.';
	parameters = {
		type: 'object',
		properties: {
			token: {
				type: 'string',
				description: 'The Telegram bot token to store.',
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
		this.store.setTelegramToken(token);
		return 'Telegram token saved.';
	}
}
