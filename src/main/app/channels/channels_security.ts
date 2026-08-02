import type { Channel, ChannelType } from '../../../shared';
import type { ChannelInboundMessage } from './channels_types';

export interface ChannelSecurityDecision {
	allowed: boolean;
	reason?: string;
}

export function canReceive(
	message: ChannelInboundMessage,
	config: Channel[ChannelType]
): ChannelSecurityDecision {
	if (config.enabled === false) {
		return { allowed: false, reason: 'channel_disabled' };
	}
	if (!config.token.trim()) {
		return { allowed: false, reason: 'channel_not_configured' };
	}
	if (!message.text.trim()) {
		return { allowed: false, reason: 'empty_text' };
	}
	if (message.chatType === 'dm') {
		const dmPolicy = config.dmPolicy ?? 'allowlist';
		if (dmPolicy === 'open') return { allowed: true };
		if (dmPolicy === 'pairing') return { allowed: false, reason: 'pairing_required' };
		if (dmPolicy === 'deny') return { allowed: false, reason: 'dm_denied' };
		if (!config.allowFrom.includes(message.senderId)) {
			return { allowed: false, reason: 'sender_not_allowed' };
		}
		return { allowed: true };
	}
	if (
		config.groupAllowFrom &&
		config.groupAllowFrom.length > 0 &&
		!config.groupAllowFrom.includes(message.chatId)
	) {
		return { allowed: false, reason: 'route_not_allowed' };
	}
	return { allowed: true };
}
