import { Tool } from '../../base.js';
import type { StoreService } from '../../../../store';
import { format, safeWhatsapp } from '../utils';

export class GetWhatsappChannelTool extends Tool {
	name = 'get_whatsapp_channel';
	description = 'Get the WhatsApp channel settings.';
	parameters = {
		type: 'object',
		properties: {},
		required: [],
	};

	constructor(private readonly store: StoreService) {
		super();
	}

	async execute(_args: Record<string, unknown>): Promise<string> {
		return format(safeWhatsapp(this.store.getWhatsappChannel()));
	}
}
