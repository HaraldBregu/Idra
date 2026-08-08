import { safeStorage } from 'electron';
import { openMcpRecord } from '../../../../src/main/mcp/mcp_record_open';
import { sealMcpRecord } from '../../../../src/main/mcp/mcp_record_seal';

const encryptionAvailableMock = safeStorage.isEncryptionAvailable as jest.Mock;
const encryptMock = safeStorage.encryptString as jest.Mock;
const decryptMock = safeStorage.decryptString as jest.Mock;

describe('MCP record credential sealing', () => {
	beforeEach(() => {
		encryptionAvailableMock.mockReturnValue(true);
		encryptMock.mockImplementation((value: string) => Buffer.from(value, 'utf8'));
		decryptMock.mockImplementation((value: Buffer) => value.toString('utf8'));
	});

	it('removes credentials from the persisted record and encrypts them', () => {
		const sealed = sealMcpRecord({
			id: 'remote',
			type: 'http',
			url: 'https://example.test/mcp',
			token: 'bearer-secret',
			client_secret: 'client-secret',
			tokens: { access_token: 'oauth-secret', token_type: 'bearer' },
		});

		expect(sealed.record).toEqual({
			id: 'remote',
			type: 'http',
			url: 'https://example.test/mcp',
			encryptedSecrets: expect.any(String),
		});
		expect(sealed.volatileSecrets).toBeUndefined();
		expect(openMcpRecord(sealed.record).record).toEqual({
			id: 'remote',
			type: 'http',
			url: 'https://example.test/mcp',
			token: 'bearer-secret',
			client_secret: 'client-secret',
			tokens: { access_token: 'oauth-secret', token_type: 'bearer' },
		});
	});

	it('keeps secrets memory-only when OS encryption is unavailable', () => {
		encryptionAvailableMock.mockReturnValue(false);
		const sealed = sealMcpRecord({
			id: 'remote',
			type: 'http',
			url: 'https://example.test/mcp',
			token: 'bearer-secret',
		});

		expect(sealed.record).not.toHaveProperty('token');
		expect(sealed.record).not.toHaveProperty('encryptedSecrets');
		expect(sealed.volatileSecrets).toEqual({ token: 'bearer-secret' });
	});

	it('identifies legacy plaintext credentials for migration', () => {
		const opened = openMcpRecord({
			id: 'legacy',
			type: 'http',
			url: 'https://example.test/mcp',
			token: 'plaintext-secret',
		});
		expect(opened.hasPlaintextSecrets).toBe(true);
		expect(opened.record).toHaveProperty('token', 'plaintext-secret');
	});
});
