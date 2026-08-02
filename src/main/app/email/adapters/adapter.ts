import type { EmailRequest, EmailResponse } from '../../../../shared/email_types';

export type EmailAdapter = (
	request: EmailRequest,
	from: string,
	apiKey: string
) => Promise<EmailResponse>;
