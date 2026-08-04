const saveSmtpSettings = jest.fn();
const getSmtpSettings = jest.fn();

jest.mock('../../../../src/main/smtp/smtp_store', () => ({ saveSmtpSettings, getSmtpSettings }));

import { saveEmailSettings } from '../../../../src/main/smtp/email_save_provider';

const smtp = {
	host: 'smtp.example.com',
	port: 465,
	secure: true,
	username: 'friday',
	password: 'secret',
	from: 'Friday <friday@example.com>',
};

describe('SMTP settings', () => {
	beforeEach(() => jest.clearAllMocks());

	it('saves a valid SMTP configuration', () => {
		getSmtpSettings.mockReturnValue(smtp);

		expect(saveEmailSettings(smtp)).toEqual({ configured: true });
		expect(saveSmtpSettings).toHaveBeenCalledWith(smtp);
	});

	it.each([
		[{ ...smtp, host: '' }, 'SMTP host and sender address are required.'],
		[{ ...smtp, port: 0 }, 'SMTP port must be between 1 and 65535.'],
		[{ ...smtp, username: 'friday', password: '' }, 'SMTP username and password must be provided together.'],
	])('rejects invalid configuration', (input, message) => {
		expect(() => saveEmailSettings(input)).toThrow(message);
	});
});
