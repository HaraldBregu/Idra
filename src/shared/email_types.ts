export const EMAIL_PROVIDER_IDS = ['resend'] as const;

export type EmailProviderId = (typeof EMAIL_PROVIDER_IDS)[number];

export interface EmailSettings {
	providerId: EmailProviderId;
	configured: Record<EmailProviderId, boolean>;
}

export interface EmailProviderInput {
	apiKey: string;
}

export interface EmailRequest {
	to: string;
	subject: string;
	text: string;
}

export interface EmailResponse {
	id: string;
}
