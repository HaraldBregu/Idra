import type { EmailProviderId } from '../../../shared/email_types';
import { getEmailProviders } from '../settings_store';

export function getEmailKey(providerId: EmailProviderId): string | undefined {
	const storedKey =
		getEmailProviders()
			.find((provider) => provider.id === providerId)
			?.apiKey.trim() ?? '';
	if (storedKey) return storedKey;

	return process.env.RESEND_API_KEY?.trim() || undefined;
}
