import type { EmailRequest, EmailResponse } from '../../../shared/email_types';

export async function sendResend(
	request: EmailRequest,
	from: string,
	apiKey: string
): Promise<EmailResponse> {
	const response = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			from,
			to: [request.to],
			subject: request.subject,
			text: request.text,
		}),
	});
	if (!response.ok) {
		const detail = await response.text().catch(() => response.statusText);
		throw new Error(`Resend send failed (${response.status}): ${detail}`);
	}

	const data = (await response.json()) as { id?: string };
	return { id: data.id ?? '' };
}
