import net from 'node:net';
import process from 'node:process';
import tls from 'node:tls';

type JsonRpcRequest = {
	jsonrpc?: unknown;
	id?: unknown;
	method?: unknown;
	params?: {
		protocolVersion?: string;
		name?: unknown;
		arguments?: unknown;
	};
};

type ToolResult = {
	content: Array<{ type: 'text'; text: string }>;
	isError?: boolean;
	structuredContent?: Record<string, unknown>;
};

type SmtpConfig = {
	host: string;
	port: number;
	secure: boolean;
	user: string;
	password: string;
};

const tools = [
	{
		name: 'send_email',
		description: 'Send one email through Gmail SMTP.',
		inputSchema: {
			type: 'object',
			properties: {
				from: { type: 'string', description: 'Sender email address.' },
				to: {
					oneOf: [
						{ type: 'string' },
						{ type: 'array', items: { type: 'string' }, minItems: 1 },
					],
					description: 'Recipient email address or addresses.',
				},
				subject: { type: 'string', description: 'Email subject.' },
				text: { type: 'string', description: 'Plain text body.' },
				html: { type: 'string', description: 'HTML body.' },
				cc: {
					oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' }, minItems: 1 }],
					description: 'CC recipient address or addresses.',
				},
				bcc: {
					oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' }, minItems: 1 }],
					description: 'BCC recipient address or addresses.',
				},
				reply_to: { type: 'string', description: 'Reply-To address.' },
			},
			required: ['from', 'to', 'subject'],
			additionalProperties: false,
		},
	},
];

const send = (message: Record<string, unknown>) => {
	process.stdout.write(`${JSON.stringify(message)}\n`);
};

const toolError = (message: string): ToolResult => ({
	content: [{ type: 'text', text: message }],
	isError: true,
});

const objectArgs = (args: unknown): Record<string, unknown> =>
	args && typeof args === 'object' && !Array.isArray(args) ? (args as Record<string, unknown>) : {};

const stringArray = (value: unknown): value is string[] =>
	Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === 'string');

const emailList = (value: unknown): value is string | string[] =>
	typeof value === 'string' || stringArray(value);

const optionalEmailList = (value: unknown): value is string | string[] | undefined =>
	value === undefined || emailList(value);

const asArray = (value: string | string[] | undefined): string[] =>
	value === undefined ? [] : Array.isArray(value) ? value : [value];

const smtpConfig = (): SmtpConfig | string => {
	const host = process.env.GMAIL_SMTP_HOST?.trim() || 'smtp.gmail.com';
	const port = Number(process.env.GMAIL_SMTP_PORT?.trim() || '587');
	const secure = process.env.GMAIL_SMTP_SECURE?.trim().toLowerCase() === 'true';
	const user = process.env.GMAIL_SMTP_USER?.trim() || '';
	const password = process.env.GMAIL_SMTP_PASSWORD || '';
	const missing: string[] = [];
	if (!user) missing.push('GMAIL_SMTP_USER');
	if (!password) missing.push('GMAIL_SMTP_PASSWORD');
	if (!Number.isInteger(port) || port <= 0) missing.push('GMAIL_SMTP_PORT');
	return missing.length > 0 ? `Missing or invalid environment variables: ${missing.join(', ')}` : { host, port, secure, user, password };
};

const validateSendEmailArgs = (args: Record<string, unknown>): string | undefined => {
	if (typeof args.from !== 'string') return 'from must be a string.';
	if (!emailList(args.to)) return 'to must be a string or non-empty string array.';
	if (typeof args.subject !== 'string') return 'subject must be a string.';
	if (args.text !== undefined && typeof args.text !== 'string') return 'text must be a string.';
	if (args.html !== undefined && typeof args.html !== 'string') return 'html must be a string.';
	if (!optionalEmailList(args.cc)) return 'cc must be a string or non-empty string array.';
	if (!optionalEmailList(args.bcc)) return 'bcc must be a string or non-empty string array.';
	if (args.reply_to !== undefined && typeof args.reply_to !== 'string') return 'reply_to must be a string.';
	if (!args.text && !args.html) return 'text or html is required.';
	return undefined;
};

const address = (value: string): string => {
	const match = value.match(/<([^<>]+)>/);
	return (match?.[1] ?? value).trim();
};

const base64 = (value: string): string => Buffer.from(value, 'utf8').toString('base64');

const normalizeNewlines = (value: string): string => value.replace(/\r?\n/g, '\r\n');

const headerValue = (value: string): string => value.replace(/\r?\n/g, ' ').trim();

const encodedSubject = (value: string): string => `=?UTF-8?B?${base64(value)}?=`;

const messageBody = (args: Record<string, unknown>): string => {
	const boundary = `friday-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
	const headers = [
		`From: ${headerValue(args.from as string)}`,
		`To: ${asArray(args.to as string | string[]).map(headerValue).join(', ')}`,
		...asArray(args.cc as string | string[] | undefined).map((cc) => `Cc: ${headerValue(cc)}`),
		typeof args.reply_to === 'string' ? `Reply-To: ${headerValue(args.reply_to)}` : undefined,
		`Subject: ${encodedSubject(args.subject as string)}`,
		'MIME-Version: 1.0',
	].filter((line): line is string => typeof line === 'string');

	if (typeof args.text === 'string' && typeof args.html === 'string') {
		return normalizeNewlines(
			[
				...headers,
				`Content-Type: multipart/alternative; boundary="${boundary}"`,
				'',
				`--${boundary}`,
				'Content-Type: text/plain; charset=UTF-8',
				'Content-Transfer-Encoding: 8bit',
				'',
				args.text,
				`--${boundary}`,
				'Content-Type: text/html; charset=UTF-8',
				'Content-Transfer-Encoding: 8bit',
				'',
				args.html,
				`--${boundary}--`,
				'',
			].join('\n')
		);
	}

	const contentType = typeof args.html === 'string' ? 'text/html' : 'text/plain';
	return normalizeNewlines(
		[
			...headers,
			`Content-Type: ${contentType}; charset=UTF-8`,
			'Content-Transfer-Encoding: 8bit',
			'',
			(typeof args.html === 'string' ? args.html : args.text) as string,
			'',
		].join('\n')
	);
};

class SmtpSession {
	private socket: net.Socket | tls.TLSSocket;
	private buffer = '';

	constructor(private readonly config: SmtpConfig) {
		this.socket = config.secure
			? tls.connect({ host: config.host, port: config.port, servername: config.host })
			: net.connect({ host: config.host, port: config.port });
		this.socket.setEncoding('utf8');
		this.socket.on('data', (chunk: string) => {
			this.buffer += chunk;
		});
	}

	close() {
		this.socket.end();
	}

	async send(command: string, expected: number | number[]): Promise<string> {
		this.socket.write(`${command}\r\n`);
		return this.read(expected);
	}

	async read(expected: number | number[]): Promise<string> {
		const allowed = Array.isArray(expected) ? expected : [expected];
		const response = await this.readResponse();
		const code = Number(response.slice(0, 3));
		if (!allowed.includes(code)) throw new Error(response);
		return response;
	}

	async upgrade(): Promise<void> {
		this.socket = tls.connect({ socket: this.socket, servername: this.config.host });
		this.socket.setEncoding('utf8');
		this.socket.on('data', (chunk: string) => {
			this.buffer += chunk;
		});
		await new Promise<void>((resolve, reject) => {
			this.socket.once('secureConnect', resolve);
			this.socket.once('error', reject);
		});
	}

	private async readResponse(): Promise<string> {
		for (;;) {
			const response = this.completeResponse();
			if (response) return response;
			await new Promise<void>((resolve, reject) => {
				const done = () => {
					this.socket.off('data', done);
					this.socket.off('error', fail);
					resolve();
				};
				const fail = (error: Error) => {
					this.socket.off('data', done);
					this.socket.off('error', fail);
					reject(error);
				};
				this.socket.once('data', done);
				this.socket.once('error', fail);
			});
		}
	}

	private completeResponse(): string | undefined {
		const lines = this.buffer.split(/\r?\n/);
		if (lines.length < 2) return undefined;
		for (let index = 0; index < lines.length - 1; index += 1) {
			if (/^\d{3} /.test(lines[index])) {
				const response = lines.slice(0, index + 1).join('\n');
				this.buffer = lines.slice(index + 1).join('\n');
				return response;
			}
		}
		return undefined;
	}
}

const sendSmtpEmail = async (config: SmtpConfig, args: Record<string, unknown>): Promise<void> => {
	const session = new SmtpSession(config);
	try {
		await session.read(220);
		await session.send(`EHLO ${config.host}`, 250);
		if (!config.secure) {
			await session.send('STARTTLS', 220);
			await session.upgrade();
			await session.send(`EHLO ${config.host}`, 250);
		}
		await session.send('AUTH LOGIN', 334);
		await session.send(base64(config.user), 334);
		await session.send(base64(config.password), 235);
		await session.send(`MAIL FROM:<${address(args.from as string)}>`, 250);
		for (const recipient of [
			...asArray(args.to as string | string[]),
			...asArray(args.cc as string | string[] | undefined),
			...asArray(args.bcc as string | string[] | undefined),
		]) {
			await session.send(`RCPT TO:<${address(recipient)}>`, [250, 251]);
		}
		await session.send('DATA', 354);
		await session.send(`${messageBody(args)}\r\n.`, 250);
		await session.send('QUIT', 221).catch(() => undefined);
	} finally {
		session.close();
	}
};

const sendEmail = async (args: Record<string, unknown>): Promise<ToolResult> => {
	const config = smtpConfig();
	if (typeof config === 'string') return toolError(config);

	const invalidArgs = validateSendEmailArgs(args);
	if (invalidArgs) return toolError(invalidArgs);

	try {
		await sendSmtpEmail(config, args);
		return {
			content: [{ type: 'text', text: 'Email sent.' }],
			structuredContent: { host: config.host, port: config.port, secure: config.secure },
		};
	} catch (error) {
		return toolError(error instanceof Error ? error.message : 'Unable to send email through Gmail SMTP.');
	}
};

const callTool = async (name: string, args: Record<string, unknown>): Promise<ToolResult> => {
	if (name === 'send_email') return sendEmail(args);
	return toolError(`Unknown tool: ${name}`);
};

const handle = async (message: JsonRpcRequest | null) => {
	if (!message || message.jsonrpc !== '2.0' || typeof message.method !== 'string') {
		if (message?.id !== undefined) {
			send({ jsonrpc: '2.0', id: message.id, error: { code: -32600, message: 'Invalid request.' } });
		}
		return;
	}
	if (message.id === undefined) return;

	if (message.method === 'initialize') {
		send({
			jsonrpc: '2.0',
			id: message.id,
			result: {
				protocolVersion: message.params?.protocolVersion ?? '2025-06-18',
				capabilities: { tools: { listChanged: false } },
				serverInfo: { name: 'gmail-smtp', version: '1.0.0' },
				instructions:
					'Send email through Gmail SMTP. Provide GMAIL_SMTP_USER and GMAIL_SMTP_PASSWORD from the MCP client environment.',
			},
		});
		return;
	}

	if (message.method === 'ping') {
		send({ jsonrpc: '2.0', id: message.id, result: {} });
		return;
	}

	if (message.method === 'tools/list') {
		send({ jsonrpc: '2.0', id: message.id, result: { tools } });
		return;
	}

	if (message.method === 'tools/call') {
		const name = message.params?.name;
		send({
			jsonrpc: '2.0',
			id: message.id,
			result: await callTool(typeof name === 'string' ? name : '', objectArgs(message.params?.arguments)),
		});
		return;
	}

	send({
		jsonrpc: '2.0',
		id: message.id,
		error: { code: -32601, message: `Method not found: ${message.method}` },
	});
};

let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk: string) => {
	buffer += chunk;
	let newline = buffer.indexOf('\n');
	while (newline >= 0) {
		const line = buffer.slice(0, newline).replace(/\r$/, '');
		buffer = buffer.slice(newline + 1);
		if (line.trim()) {
			try {
				void handle(JSON.parse(line));
			} catch {
				send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error.' } });
			}
		}
		newline = buffer.indexOf('\n');
	}
});
