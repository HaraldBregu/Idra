import type { EmailSettings, SmtpSettingsInput } from '../../shared/email_types';
import { getEmailSettings } from './email_get_settings';
import { saveSmtpSettings } from './smtp_store';

export function saveEmailSettings(input: SmtpSettingsInput): EmailSettings {
	const host = input.host.trim();
	const username = input.username.trim();
	const password = input.password.trim();
	const from = input.from.trim();
	if (!host || !from) throw new Error('SMTP host and sender address are required.');
	if (!Number.isInteger(input.port) || input.port < 1 || input.port > 65535) {
		throw new Error('SMTP port must be between 1 and 65535.');
	}
	if ((username && !password) || (!username && password)) {
		throw new Error('SMTP username and password must be provided together.');
	}

	saveSmtpSettings({ host, port: input.port, secure: input.secure, username, password, from });
	return getEmailSettings();
}
