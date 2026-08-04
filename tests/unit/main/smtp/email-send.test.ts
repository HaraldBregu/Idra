const sendMail = jest.fn();
const createTransport = jest.fn(() => ({ sendMail }));

jest.mock('nodemailer', () => ({ __esModule: true, default: { createTransport } }));
jest.mock('../../../../src/main/smtp/email_store', () => ({ getSmtpSettings: jest.fn() }));

import { getSmtpSettings } from '../../../../src/main/smtp/email_store';
import { sendEmail } from '../../../../src/main/smtp/email_send';

const smtp = {
	host: 'smtp.example.com',
	port: 587,
	secure: false,
	username: 'friday',
	password: 'secret',
	from: 'Friday <friday@example.com>',
};

describe('sendEmail', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('sends through the configured SMTP transport', async () => {
		jest.mocked(getSmtpSettings).mockReturnValue(smtp);
		sendMail.mockResolvedValue({ messageId: 'message-id' });

		await expect(sendEmail({ to: 'to@example.com', subject: 'Subject', text: 'Body' })).resolves.toEqual({
			id: 'message-id',
		});
		expect(createTransport).toHaveBeenCalledWith({
			host: smtp.host,
			port: smtp.port,
			secure: smtp.secure,
			auth: { user: smtp.username, pass: smtp.password },
		});
		expect(sendMail).toHaveBeenCalledWith({ from: smtp.from, to: 'to@example.com', subject: 'Subject', text: 'Body' });
	});

	it('requires SMTP settings', async () => {
		jest.mocked(getSmtpSettings).mockReturnValue(undefined);

		await expect(sendEmail({ to: 'to@example.com', subject: 'Subject', text: 'Body' })).rejects.toThrow(
			'Configure an SMTP server'
		);
	});
});
