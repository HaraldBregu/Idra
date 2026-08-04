import {
	EMAIL_PROVIDER_IDS,
	type EmailProviderId,
	type EmailProviderInput,
	type EmailSettings,
} from '../../shared/email_types';
import { getEmailSettings } from './email_get_settings';
import { saveEmailConfiguration, setEmailProviders } from './email_store';

export function saveEmailProvider(
	providerId: EmailProviderId,
	input: EmailProviderInput
): EmailSettings {
	if (!EMAIL_PROVIDER_IDS.includes(providerId)) throw new Error('Unknown email provider.');
	const apiKey = input.apiKey.trim();
	if (!apiKey) throw new Error('An email provider API key is required.');

	setEmailProviders([
		{
			id: providerId,
			name: 'Resend',
			apiKey,
			baseUrl: 'https://api.resend.com',
		},
	]);
	saveEmailConfiguration({ providerId });
	return getEmailSettings();
}
