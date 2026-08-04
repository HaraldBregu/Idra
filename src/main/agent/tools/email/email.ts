import { z } from 'zod';
import { getEmailSettings, sendEmail } from '../../../smtp';
import type { Tool } from '../../types';
import { tool } from '../tool';

const sendEmailTool = tool({
	name: 'send_email',
	description:
		'Send a transactional email through the configured email provider. The sender address is server-controlled. Returns the provider message id.',
	inputSchema: z.object({
		to: z.string().min(1).describe('Recipient email address.'),
		subject: z.string().min(1).describe('Email subject.'),
		text: z.string().min(1).describe('Plain-text email body.'),
	}),
	execute: async ({ to, subject, text }) => {
		return JSON.stringify(await sendEmail({ to, subject, text }), null, 2);
	},
});

export function getEmailTools(): Tool[] {
	return getEmailSettings().configured ? [sendEmailTool] : [];
}
