import type { EmailProviderId, EmailRequest, EmailResponse } from '../../../shared/email_types';
import type { EmailAdapter } from './adapters/adapter';
import { sendResend } from './adapters/resend';
import { getEmailKey } from './email_get_key';
import { getEmailSettings } from './email_get_settings';

const senders: Record<EmailProviderId, EmailAdapter> = {
	resend: sendResend,
};

// ponytail: sender is env-controlled; move into email settings when a settings UI exists
const DEFAULT_FROM = 'Friday <onboarding@resend.dev>';

export async function sendEmail(request: EmailRequest): Promise<EmailResponse> {
	const { providerId } = getEmailSettings();
	const apiKey = getEmailKey(providerId);
	if (!apiKey) {
		throw new Error(
			'Configure Resend (RESEND_API_KEY or an email provider in settings) before using send_email.'
		);
	}
	const from = process.env.EMAIL_FROM?.trim() || DEFAULT_FROM;

	return senders[providerId](request, from, apiKey);
}
