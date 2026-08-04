import type { EmailSettings } from '../../shared/email_types';
import { getSmtpSettings } from './email_store';

export function getEmailSettings(): EmailSettings {
	return { configured: Boolean(getSmtpSettings()) };
}
