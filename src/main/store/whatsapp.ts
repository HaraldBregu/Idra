import type { Channel, WhatsappChannelProperties } from '../../shared/types';
import type { SettingsStore } from './types';

const DEFAULT_WHATSAPP_CHANNEL: WhatsappChannelProperties = { phoneNumber: '', token: '' };

export function getWhatsappChannel(store: SettingsStore): WhatsappChannelProperties {
	const whatsapp = store.get('channel')?.whatsapp;
	return {
		phoneNumber: whatsapp?.phoneNumber ?? DEFAULT_WHATSAPP_CHANNEL.phoneNumber,
		token: whatsapp?.token ?? DEFAULT_WHATSAPP_CHANNEL.token,
	};
}

export function setWhatsappChannel(
	store: SettingsStore,
	properties: WhatsappChannelProperties
): Channel {
	const current = store.get('channel');
	const next: Channel = {
		...current,
		whatsapp: {
			phoneNumber: properties.phoneNumber,
			token: properties.token,
		},
	} as Channel;
	store.set('channel', next);
	return next;
}

export function setWhatsappPhoneNumber(store: SettingsStore, phoneNumber: string): Channel {
	return setWhatsappChannel(store, {
		...getWhatsappChannel(store),
		phoneNumber,
	});
}

export function setWhatsappToken(store: SettingsStore, token: string): Channel {
	return setWhatsappChannel(store, {
		...getWhatsappChannel(store),
		token,
	});
}
