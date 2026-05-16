import { resolveIngressAdmission, type ChannelAdmissionDecision } from './ingress';
import type {
	ChannelAccountSnapshot,
	ChannelInboundMessage,
	ChannelNormalizedInboundMessage,
	ChannelPlugin,
} from './types';

export interface ChannelTurnRunInput {
	message: ChannelInboundMessage;
	accountId: string;
	config: unknown;
	plugin: ChannelPlugin;
	resolveAccount(config: unknown, accountId: string): ChannelAccountSnapshot | null;
	record?(message: ChannelNormalizedInboundMessage): Promise<void> | void;
	dispatch(
		message: ChannelNormalizedInboundMessage,
		account: ChannelAccountSnapshot
	): Promise<void> | void;
	finalize?(
		decision: ChannelAdmissionDecision | null,
		error: unknown | null
	): Promise<void> | void;
}

export interface ChannelTurnResult {
	decision: ChannelAdmissionDecision;
	normalized?: ChannelNormalizedInboundMessage;
}

export async function runChannelTurn(input: ChannelTurnRunInput): Promise<ChannelTurnResult> {
	let decision: ChannelAdmissionDecision | null = null;
	let error: unknown | null = null;

	try {
		const account = input.resolveAccount(input.config, input.accountId);
		if (!account) {
			const normalized = normalizeMissingAccountMessage(input);
			decision = {
				outcome: 'drop',
				reason: 'account_not_found',
				authMode: 'inbound',
				diagnostics: {
					channelId: normalized.channelId,
					accountId: normalized.accountId,
					chatType: normalized.chatType,
					reason: 'account_not_found',
				},
			};
			return { decision, normalized };
		}

		const normalized = input.plugin.messaging?.normalizeInbound?.(input.message, input.accountId);
		if (!normalized) {
			decision = {
				outcome: 'drop',
				reason: 'unsupported_message',
				authMode: 'inbound',
				diagnostics: {
					channelId: input.message.type,
					accountId: input.accountId,
					chatType: input.message.chatType ?? 'dm',
					reason: 'unsupported_message',
				},
			};
			return { decision };
		}

		decision = resolveIngressAdmission({
			message: normalized,
			account,
			security: input.plugin.security,
		});

		if (decision.outcome !== 'dispatch') {
			return { decision, normalized };
		}

		await input.record?.(normalized);
		await input.dispatch(normalized, account);
		return { decision, normalized };
	} catch (caught) {
		error = caught;
		throw caught;
	} finally {
		await input.finalize?.(decision, error);
	}
}

function normalizeMissingAccountMessage(input: ChannelTurnRunInput): ChannelNormalizedInboundMessage {
	return {
		channelId: input.message.type,
		accountId: input.accountId,
		senderId: '',
		targetId: '',
		chatType: input.message.chatType ?? 'dm',
		messageId: '',
		text: '',
		media: [],
		provenance: {},
		idempotencyKey: `${input.message.type}:${input.accountId}:missing-account`,
		receivedAt: Date.now(),
	};
}
