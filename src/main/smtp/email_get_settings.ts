import type { EmailSettings } from '../../shared/email_types';
import { getSmtpProviders, getSmtpSettings } from './smtp_store';

export function getEmailSettings(): EmailSettings {
	const selected = getSmtpSettings();
	return {
		configured: Boolean(selected),
		providers: getSmtpProviders().map(({ id, name }) => ({ id, name })),
		selectedProviderId: selected?.id,
	};
}
