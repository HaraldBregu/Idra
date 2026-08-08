import process from 'node:process';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

type ToolResult = {
	content: Array<{ type: 'text'; text: string }>;
	isError?: boolean;
	structuredContent?: Record<string, unknown>;
};

const apiBaseUrl = (process.env.RESEND_API_BASE_URL?.trim() || 'https://api.resend.com').replace(
	/\/$/,
	''
);

const tools = [
	{
		name: 'send_email',
		description: 'Send one email through the Resend API.',
		inputSchema: {
			type: 'object' as const,
			properties: {
				from: {
					type: 'string',
					description: 'Sender email address, optionally formatted as "Name <sender@example.com>".',
				},
				to: {
					oneOf: [
						{ type: 'string' },
						{ type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 50 },
					],
					description: 'Recipient email address or addresses.',
				},
				subject: { type: 'string', description: 'Email subject.' },
				html: { type: 'string', description: 'HTML body.' },
				text: { type: 'string', description: 'Plain text body.' },
				cc: {
					oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' }, minItems: 1 }],
					description: 'CC recipient address or addresses.',
				},
				bcc: {
					oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' }, minItems: 1 }],
					description: 'BCC recipient address or addresses.',
				},
				reply_to: {
					oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' }, minItems: 1 }],
					description: 'Reply-To address or addresses.',
				},
				headers: { type: 'object', description: 'Custom email headers.' },
				attachments: { type: 'array', description: 'Resend attachment objects.' },
				tags: { type: 'array', description: 'Resend tag objects.' },
				template: { type: 'object', description: 'Published Resend template object.' },
				scheduled_at: { type: 'string', description: 'Scheduled send time.' },
				idempotency_key: {
					type: 'string',
					description: 'Optional Resend idempotency key for this request.',
				},
			},
			required: ['from', 'to', 'subject'],
			additionalProperties: false,
		},
	},
];

const toolError = (message: string): ToolResult => ({
	content: [{ type: 'text', text: message }],
	isError: true,
});

const errorMessage = (error: unknown): string =>
	error instanceof Error ? error.message : 'Unable to reach the Resend API.';

const objectArgs = (args: unknown): Record<string, unknown> =>
	args && typeof args === 'object' && !Array.isArray(args) ? (args as Record<string, unknown>) : {};

const stringArray = (value: unknown): value is string[] =>
	Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === 'string');

const emailList = (value: unknown): value is string | string[] =>
	typeof value === 'string' || stringArray(value);

const optionalEmailList = (value: unknown): value is string | string[] | undefined =>
	value === undefined || emailList(value);

const optionalObject = (value: unknown): value is Record<string, unknown> | undefined =>
	value === undefined || (value !== null && typeof value === 'object' && !Array.isArray(value));

const optionalArray = (value: unknown): value is unknown[] | undefined =>
	value === undefined || Array.isArray(value);

const validateSendEmailArgs = (args: Record<string, unknown>): string | undefined => {
	if (typeof args.from !== 'string') return 'from must be a string.';
	if (!emailList(args.to)) return 'to must be a string or non-empty string array.';
	if (Array.isArray(args.to) && args.to.length > 50) return 'to cannot contain more than 50 recipients.';
	if (typeof args.subject !== 'string') return 'subject must be a string.';
	if (args.html !== undefined && typeof args.html !== 'string') return 'html must be a string.';
	if (args.text !== undefined && typeof args.text !== 'string') return 'text must be a string.';
	if (!optionalEmailList(args.cc)) return 'cc must be a string or non-empty string array.';
	if (!optionalEmailList(args.bcc)) return 'bcc must be a string or non-empty string array.';
	if (!optionalEmailList(args.reply_to)) return 'reply_to must be a string or non-empty string array.';
	if (!optionalObject(args.headers)) return 'headers must be an object.';
	if (!optionalArray(args.attachments)) return 'attachments must be an array.';
	if (!optionalArray(args.tags)) return 'tags must be an array.';
	if (!optionalObject(args.template)) return 'template must be an object.';
	if (args.scheduled_at !== undefined && typeof args.scheduled_at !== 'string') {
		return 'scheduled_at must be a string.';
	}
	if (args.idempotency_key !== undefined && typeof args.idempotency_key !== 'string') {
		return 'idempotency_key must be a string.';
	}
	if (!args.html && !args.text && !args.template) return 'html, text, or template is required.';
	if (args.template && (args.html || args.text)) return 'template cannot be combined with html or text.';
	return undefined;
};

const resendPayload = (args: Record<string, unknown>): Record<string, unknown> => {
	const payload: Record<string, unknown> = {
		from: args.from,
		to: args.to,
		subject: args.subject,
	};
	for (const key of [
		'html',
		'text',
		'cc',
		'bcc',
		'reply_to',
		'headers',
		'attachments',
		'tags',
		'template',
		'scheduled_at',
	]) {
		if (args[key] !== undefined) payload[key] = args[key];
	}
	return payload;
};

const sendEmail = async (args: Record<string, unknown>): Promise<ToolResult> => {
	const apiKey = process.env.RESEND_API_KEY?.trim();
	if (!apiKey) return toolError('Missing RESEND_API_KEY environment variable.');

	const invalidArgs = validateSendEmailArgs(args);
	if (invalidArgs) return toolError(invalidArgs);

	const headers: Record<string, string> = {
		Authorization: `Bearer ${apiKey}`,
		'Content-Type': 'application/json',
	};
	if (typeof args.idempotency_key === 'string') headers['Idempotency-Key'] = args.idempotency_key;

	const response = await fetch(`${apiBaseUrl}/emails`, {
		method: 'POST',
		headers,
		body: JSON.stringify(resendPayload(args)),
	}).catch((error: unknown) => error);
	if (!(response instanceof Response)) return toolError(errorMessage(response));

	const responseBody = (await response.json().catch(() => ({}))) as Record<string, unknown>;
	if (!response.ok) {
		const detail =
			typeof responseBody.message === 'string'
				? responseBody.message
				: `Resend API returned HTTP ${response.status}.`;
		return {
			content: [{ type: 'text', text: detail }],
			isError: true,
			structuredContent: { status: response.status, response: responseBody },
		};
	}

	const id = typeof responseBody.id === 'string' ? responseBody.id : undefined;
	return {
		content: [{ type: 'text', text: id ? `Email sent: ${id}` : 'Email sent.' }],
		structuredContent: responseBody,
	};
};

const server = new Server(
	{ name: 'resend', version: '1.0.0' },
	{
		capabilities: { tools: {} },
		instructions: 'Send email through Resend. Provide RESEND_API_KEY from the MCP client environment.',
	}
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
	if (request.params.name === 'send_email') return sendEmail(objectArgs(request.params.arguments));
	return toolError(`Unknown tool: ${request.params.name}`);
});

await server.connect(new StdioServerTransport());
