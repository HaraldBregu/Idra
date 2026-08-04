const saveSmtpProvider = jest.fn();
const updateSmtpProvider = jest.fn();
const getSmtpSettings = jest.fn();
const getSmtpProviders = jest.fn(() => []);

jest.mock('../../../../src/main/smtp/smtp_store', () => ({
	saveSmtpProvider,
	updateSmtpProvider,
	getSmtpSettings,
	getSmtpProviders,
}));

import { saveEmailProvider } from '../../../../src/main/smtp/email_save_provider';

const smtp = {
	name: 'Primary SMTP',
	host: 'smtp.example.com',
	port: 465,
	secure: true,
	username: 'friday',
	password: 'secret',
	from: 'Friday <friday@example.com>',
};

describe('SMTP settings', () => {
	beforeEach(() => jest.clearAllMocks());

	it('saves a valid SMTP provider', () => {
		getSmtpSettings.mockReturnValue(smtp);

		expect(saveEmailProvider(smtp)).toEqual({
			configured: true,
			providers: [],
			selectedProviderId: undefined,
		});
		expect(saveSmtpProvider).toHaveBeenCalledWith(expect.objectContaining(smtp));
	});

	it.each([
		[{ ...smtp, name: '' }, 'SMTP name, host, and sender address are required.'],
		[{ ...smtp, port: 0 }, 'SMTP port must be between 1 and 65535.'],
		[{ ...smtp, username: 'friday', password: '' }, 'SMTP username and password must be provided together.'],
	])('rejects invalid configuration', (input, message) => {
		expect(() => saveEmailProvider(input)).toThrow(message);
	});

	it('updates a provider without replacing its password when left blank', () => {
		getSmtpProviders.mockReturnValue([{ id: 'smtp-1', ...smtp }]);
		getSmtpSettings.mockReturnValue({ id: 'smtp-1', ...smtp });

		saveEmailProvider({ ...smtp, host: 'smtp.updated.example.com', password: '' }, 'smtp-1');

		expect(updateSmtpProvider).toHaveBeenCalledWith({
			id: 'smtp-1',
			...smtp,
			host: 'smtp.updated.example.com',
		});
	});
});
