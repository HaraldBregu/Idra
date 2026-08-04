export interface EmailSettings {
	configured: boolean;
	providers: SmtpProviderSummary[];
}

export interface SmtpProviderSummary {
	id: string;
	name: string;
	host: string;
	port: number;
	secure: boolean;
	username: string;
	from: string;
	default: boolean;
}

export interface SmtpProviderInput {
	name: string;
	host: string;
	port: number;
	secure: boolean;
	username: string;
	password: string;
	from: string;
}

export interface SmtpProvider extends SmtpProviderInput {
	id: string;
	default: boolean;
}

export interface EmailRequest {
	to: string;
	subject: string;
	text: string;
}

export interface EmailResponse {
	id: string;
}
