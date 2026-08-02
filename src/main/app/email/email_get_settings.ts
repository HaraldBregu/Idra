import {
	EMAIL_PROVIDER_IDS,
	type EmailProviderId,
	type EmailSettings,
} from '../../../shared/email_types';
import { getEmailKey } from './email_get_key';
import { getEmailConfiguration } from './email_store';

export function getEmailSettings(): EmailSettings {
	const { providerId } = getEmailConfiguration();
	const resolvedId =
		typeof providerId === 'string' && EMAIL_PROVIDER_IDS.includes(providerId as EmailProviderId)
			? (providerId as EmailProviderId)
			: 'resend';
	const configured = Object.fromEntries(
		EMAIL_PROVIDER_IDS.map((id) => [id, Boolean(getEmailKey(id))])
	) as Record<EmailProviderId, boolean>;

	return { providerId: resolvedId, configured };
}
