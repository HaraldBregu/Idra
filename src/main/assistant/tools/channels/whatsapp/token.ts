import { Tool } from '../../base.js';
import type { StoreService } from '../../../../store';
import { stringArg } from '../utils';

export class SetWhatsappTokenTool extends Tool {
	name = 'set_whatsapp_token';
	description = 'Set the WhatsApp channel token.';
	parameters = {
		type: 'object',
		properties: {
			token: {
				type: 'string',
				description: 'The WhatsApp channel token to store.',
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
		this.store.setWhatsappToken(token);
		return 'WhatsApp token saved.';
	}
}
