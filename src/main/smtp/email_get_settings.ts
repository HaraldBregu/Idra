import type { EmailSettings } from '../../shared/email_types';
import { getSmtpProviders, getSmtpSettings } from './smtp_store';

export function getEmailSettings(): EmailSettings {
	const selected = getSmtpSettings();
	return {
		configured: Boolean(selected),
		providers: getSmtpProviders().map(({ id, name, host, port, secure, username, from }) => ({
			id,
			name,
			host,
			port,
			secure,
			username,
			from,
		})),
		selectedProviderId: selected?.id,
	};
}
