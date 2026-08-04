import nodemailer from 'nodemailer';
import { statSync } from 'node:fs';
import type { EmailRequest, EmailResponse } from '../../shared/email_types';
import { getSmtpSettings } from './smtp_store';

export async function sendEmail(request: EmailRequest): Promise<EmailResponse> {
	const settings = getSmtpSettings();
	if (!settings) throw new Error('Configure an SMTP server before using send_email.');
	const attachments = request.attachments?.map((attachment) => {
		if (!statSync(attachment.path).isFile()) {
			throw new Error(`Email attachment is not a file: ${attachment.path}`);
		}
		return { path: attachment.path };
	});
	const transport = nodemailer.createTransport({
		host: settings.host,
		port: settings.port,
		secure: settings.secure,
		auth: settings.username ? { user: settings.username, pass: settings.password } : undefined,
	});
	const response = await transport.sendMail({
		from: settings.from,
		to: request.to,
		subject: request.subject,
		text: request.text,
		attachments,
	});
	return { id: response.messageId };
}
