import { Tool } from '../../base.js';
import type { StoreService } from '../../../../store';
import { stringArg } from '../utils';

export class SetWhatsappPhoneTool extends Tool {
	name = 'set_whatsapp_phone_number';
	description = 'Set the WhatsApp channel phone number.';
	parameters = {
		type: 'object',
		properties: {
			phoneNumber: {
				type: 'string',
				description: 'The WhatsApp phone number in E.164 digits without the leading plus.',
			},
		},
		required: ['phoneNumber'],
		additionalProperties: false,
	};

	constructor(private readonly store: StoreService) {
		super();
	}

	async execute(args: Record<string, unknown>): Promise<string> {
		const phoneNumber = stringArg(args, ['phoneNumber', 'phone_number']);
		if (phoneNumber === null) {
			return 'Error: phoneNumber must be a string';
		}
		this.store.setWhatsappPhoneNumber(phoneNumber);
		return 'WhatsApp phone number saved.';
	}
}
