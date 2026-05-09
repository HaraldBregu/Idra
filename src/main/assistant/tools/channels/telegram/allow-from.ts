import { Tool } from '../../base.js';
import type { StoreService } from '../../../../store';
import { stringListArg } from '../utils';

export class SetTelegramAllowFromTool extends Tool {
	name = 'set_telegram_allow_from';
	description = 'Set the Telegram sender allow list.';
	parameters = {
		type: 'object',
		properties: {
			allowFrom: {
				type: 'array',
				items: { type: 'string' },
				description: 'Telegram sender ids allowed to use the channel.',
			},
		},
		required: ['allowFrom'],
		additionalProperties: false,
	};

	constructor(private readonly store: StoreService) {
		super();
	}

	async execute(args: Record<string, unknown>): Promise<string> {
		const allowFrom = stringListArg(args, ['allowFrom', 'allow_from']);
		if (allowFrom === null) {
			return 'Error: allowFrom must be an array of strings';
		}
		this.store.setTelegramAllowFrom(allowFrom);
		return 'Telegram allow list saved.';
	}
}
