import { timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { app } from 'electron';
import { decode, encode } from '../../shared/api_codec';
import { invoke } from './api_invoke';
import { subscribe } from './api_events';
import { token } from './api_token';

const MAX_BODY_BYTES = 64 * 1024 * 1024;

const CORS = {
	'access-control-allow-origin': '*',
	'access-control-allow-headers': 'authorization, content-type',
	'access-control-allow-methods': 'GET, POST, OPTIONS',
};

function authorized(req: IncomingMessage): boolean {
	const provided = Buffer.from((req.headers.authorization ?? '').replace(/^Bearer\s+/i, ''));
	const expected = Buffer.from(token());
	return provided.length === expected.length && timingSafeEqual(provided, expected);
}

function json(res: ServerResponse, status: number, body: unknown): void {
	res.writeHead(status, { ...CORS, 'content-type': 'application/json' });
	res.end(JSON.stringify(encode(body)));
}

async function body(req: IncomingMessage): Promise<{ channel?: string; args?: unknown[] }> {
	const chunks: Buffer[] = [];
	let size = 0;
	for await (const chunk of req) {
		size += chunk.length;
		if (size > MAX_BODY_BYTES) throw new Error('Request body too large.');
		chunks.push(chunk as Buffer);
	}
	if (size === 0) return {};
	return decode(JSON.parse(Buffer.concat(chunks).toString('utf8'))) as {
		channel?: string;
		args?: unknown[];
	};
}

function stream(res: ServerResponse): void {
	res.writeHead(200, {
		...CORS,
		'content-type': 'text/event-stream',
		'cache-control': 'no-cache',
		connection: 'keep-alive',
	});
	res.write(': connected\n\n');
	const unsubscribe = subscribe((channel, data) => {
		res.write(`data: ${JSON.stringify(encode({ channel, data }))}\n\n`);
	});
	res.on('close', unsubscribe);
}

export async function request(req: IncomingMessage, res: ServerResponse): Promise<void> {
	const path = (req.url ?? '/').split('?')[0];

	if (req.method === 'OPTIONS') {
		res.writeHead(204, CORS);
		res.end();
		return;
	}

	if (!authorized(req)) {
		json(res, 401, { success: false, error: { code: 'Unauthorized', message: 'Invalid token.' } });
		return;
	}

	if (req.method === 'GET' && path === '/health') {
		json(res, 200, { name: 'friday', version: app.getVersion() });
		return;
	}

	if (req.method === 'GET' && path === '/events') {
		stream(res);
		return;
	}

	if (req.method === 'POST' && path === '/invoke') {
		try {
			const { channel, args } = await body(req);
			if (!channel) throw new Error('Missing "channel".');
			json(res, 200, await invoke(channel, args ?? []));
		} catch (error) {
			json(res, 400, {
				success: false,
				error: { code: 'BadRequest', message: (error as Error).message },
			});
		}
		return;
	}

	json(res, 404, { success: false, error: { code: 'NotFound', message: `No route ${path}.` } });
}
