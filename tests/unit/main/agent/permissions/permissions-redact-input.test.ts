import { redactApprovalInput } from '../../../../../src/main/agent/permissions/permissions_redact_input';

it('redacts nested credential fields without changing ordinary approval scope', () => {
	expect(
		redactApprovalInput({
			url: 'https://example.com',
			token: 'secret',
			auth: { client_secret: 'secret', account: 'visible' },
			items: [{ apiKey: 'secret', name: 'visible' }],
		})
	).toEqual({
		url: 'https://example.com',
		token: '[REDACTED]',
		auth: { client_secret: '[REDACTED]', account: 'visible' },
		items: [{ apiKey: '[REDACTED]', name: 'visible' }],
	});
});
