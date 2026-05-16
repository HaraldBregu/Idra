import { resolveIngressAdmission } from '../../../../src/main/channels/ingress';
import type { ChannelAccountSnapshot, ChannelNormalizedInboundMessage } from '../../../../src/main/channels';

const account: ChannelAccountSnapshot = {
	id: 'default',
	label: 'Default',
	enabled: true,
	configured: true,
	allowFrom: ['allowed'],
	dmPolicy: 'allowlist',
};

const message: ChannelNormalizedInboundMessage = {
	channelId: 'telegram',
	accountId: 'default',
	senderId: 'blocked',
	targetId: 'chat',
	chatType: 'dm',
	messageId: 'm1',
	text: 'hello',
	media: [],
	provenance: {},
	idempotencyKey: 'telegram:default:chat:m1',
	receivedAt: 1,
};

describe('resolveIngressAdmission', () => {
	it('returns structured dispatch decisions', () => {
		expect(resolveIngressAdmission({ message, account, authMode: 'none' })).toMatchObject({
			outcome: 'dispatch',
			authMode: 'none',
		});
	});

	it('redacts raw sender and route values from diagnostics', () => {
		const decision = resolveIngressAdmission({
			message,
			account,
			security: {
				canReceive: () => ({ allowed: false, reason: 'sender_not_allowed' }),
			},
		});

		expect(decision).toMatchObject({
			outcome: 'drop',
			reason: 'sender_not_allowed',
			diagnostics: {
				channelId: 'telegram',
				accountId: 'default',
				chatType: 'dm',
				reason: 'sender_not_allowed',
			},
		});
		expect(JSON.stringify(decision.diagnostics)).not.toContain('blocked');
		expect(JSON.stringify(decision.diagnostics)).not.toContain('chat');
	});

	it('treats pairing and mention gates as non-error admission outcomes', () => {
		expect(
			resolveIngressAdmission({
				message,
				account,
				security: { canReceive: () => ({ allowed: false, reason: 'pairing_required' }) },
			}).outcome
		).toBe('handled');

		expect(
			resolveIngressAdmission({
				message,
				account,
				security: { canReceive: () => ({ allowed: false, reason: 'mention_miss' }) },
			}).outcome
		).toBe('observeOnly');
	});
});
