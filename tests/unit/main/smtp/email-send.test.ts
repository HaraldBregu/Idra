const sendMail = jest.fn();
const createTransport = jest.fn(() => ({ sendMail }));
const statSync = jest.fn(() => ({ isFile: () => true }));

jest.mock('nodemailer', () => ({ __esModule: true, default: { createTransport } }));
jest.mock('node:fs', () => ({ statSync }));
jest.mock('../../../../src/main/smtp/smtp_store', () => ({ getSmtpSettings: jest.fn() }));

import { getSmtpSettings } from '../../../../src/main/smtp/smtp_store';
import { sendEmail } from '../../../../src/main/smtp/email_send';

const smtp = {
	id: 'smtp-1',
	name: 'Primary SMTP',
	default: true,
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

		await expect(
			sendEmail({
				to: 'to@example.com',
				subject: 'Subject',
				text: 'Body',
				attachments: [{ path: '/files/invoice.pdf' }],
			})
		).resolves.toEqual({ id: 'message-id' });
		expect(createTransport).toHaveBeenCalledWith({
			host: smtp.host,
			port: smtp.port,
			secure: smtp.secure,
			auth: { user: smtp.username, pass: smtp.password },
		});
		expect(sendMail).toHaveBeenCalledWith({
			from: smtp.from,
			to: 'to@example.com',
			subject: 'Subject',
			text: 'Body',
			attachments: [{ path: '/files/invoice.pdf' }],
		});
	});

	it('requires SMTP settings', async () => {
		jest.mocked(getSmtpSettings).mockReturnValue(undefined);

		await expect(sendEmail({ to: 'to@example.com', subject: 'Subject', text: 'Body' })).rejects.toThrow(
			'Configure an SMTP server'
		);
	});

	it('rejects attachments that are not files', async () => {
		jest.mocked(getSmtpSettings).mockReturnValue(smtp);
		statSync.mockReturnValueOnce({ isFile: () => false });

		await expect(
			sendEmail({
				to: 'to@example.com',
				subject: 'Subject',
				text: 'Body',
				attachments: [{ path: '/files/folder' }],
			})
		).rejects.toThrow('Email attachment is not a file: /files/folder');
	});
});
