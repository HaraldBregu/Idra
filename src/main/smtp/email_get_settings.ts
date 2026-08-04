import type { EmailSettings } from '../../shared/email_types';
import { getSmtpSettings } from './smtp_store';

export function getEmailSettings(): EmailSettings {
	return { configured: Boolean(getSmtpSettings()) };
}
