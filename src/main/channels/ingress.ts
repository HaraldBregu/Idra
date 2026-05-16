import type {
	ChannelAccountSnapshot,
	ChannelAdmissionOutcome,
	ChannelEventAuthMode,
	ChannelNormalizedInboundMessage,
	ChannelSecurityAdapter,
} from './types';

export interface ChannelAdmissionDecision {
	outcome: ChannelAdmissionOutcome;
	reason?: string;
	authMode: ChannelEventAuthMode;
	diagnostics: {
		channelId: string;
		accountId: string;
		chatType: string;
		reason?: string;
	};
}

export interface ResolveIngressAdmissionInput {
	message: ChannelNormalizedInboundMessage;
	account: ChannelAccountSnapshot;
	security?: ChannelSecurityAdapter;
	authMode?: ChannelEventAuthMode;
}

export function resolveIngressAdmission(
	input: ResolveIngressAdmissionInput
): ChannelAdmissionDecision {
	const authMode = input.authMode ?? 'inbound';
	if (authMode === 'none') {
		return buildDecision('dispatch', input, authMode);
	}

	const securityDecision = input.security?.canReceive(input.message, input.account) ?? {
		allowed: true,
	};

	if (securityDecision.allowed) {
		return buildDecision('dispatch', input, authMode);
	}

	const reason = securityDecision.reason ?? 'not_allowed';
	if (reason === 'pairing_required') {
		return buildDecision('handled', input, authMode, reason);
	}
	if (reason === 'mention_miss') {
		return buildDecision('observeOnly', input, authMode, reason);
	}
	return buildDecision('drop', input, authMode, reason);
}

function buildDecision(
	outcome: ChannelAdmissionOutcome,
	input: ResolveIngressAdmissionInput,
	authMode: ChannelEventAuthMode,
	reason?: string
): ChannelAdmissionDecision {
	return {
		outcome,
		reason,
		authMode,
		diagnostics: {
			channelId: input.message.channelId,
			accountId: input.message.accountId,
			chatType: input.message.chatType,
			reason,
		},
	};
}
