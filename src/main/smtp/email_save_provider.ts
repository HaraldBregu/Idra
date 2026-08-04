import { randomUUID } from 'node:crypto';
import type { EmailSettings, SmtpProviderInput } from '../../shared/email_types';
import { getEmailSettings } from './email_get_settings';
import { saveSmtpProvider, selectSmtpProvider } from './smtp_store';


export function saveEmailProvider(input: SmtpProviderInput): EmailSettings {
	const name = input.name.trim();
	const host = input.host.trim();
	const username = input.username.trim();
	const password = input.password.trim();
	const from = input.from.trim();
	if (!name || !host || !from) throw new Error('SMTP name, host, and sender address are required.');
	if (!Number.isInteger(input.port) || input.port < 1 || input.port > 65535) {
		throw new Error('SMTP port must be between 1 and 65535.');
	}
	if ((username && !password) || (!username && password)) {
		throw new Error('SMTP username and password must be provided together.');
	}

	saveSmtpProvider({ id: randomUUID(), name, host, port: input.port, secure: input.secure, username, password, from });
	return getEmailSettings();
}

export function selectEmailProvider(providerId: string): EmailSettings {
	selectSmtpProvider(providerId);
	return getEmailSettings();
}
