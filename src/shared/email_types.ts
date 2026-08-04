export interface EmailSettings {
	configured: boolean;
}

export interface SmtpSettingsInput {
	host: string;
	port: number;
	secure: boolean;
	username: string;
	password: string;
	from: string;
}

export interface SmtpSettings extends SmtpSettingsInput {
}

export interface EmailRequest {
	to: string;
	subject: string;
	text: string;
}

export interface EmailResponse {
	id: string;
}
