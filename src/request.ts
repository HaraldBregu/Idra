import type { IncomingMessage } from 'node:http';
import { z } from 'zod';

const requestSchema = z
	.object({
		message: z.string().trim().min(1).max(100_000),
		sessionId: z.string().uuid().optional(),
	})
	.strict();

export type TestRequest = z.infer<typeof requestSchema>;

export async function readRequest(request: IncomingMessage): Promise<TestRequest> {
	const chunks: Buffer[] = [];
	let size = 0;
	for await (const chunk of request) {
		const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
		size += bytes.length;
		if (size > 1_048_576) throw new Error('Request body exceeds 1 MiB.');
		chunks.push(bytes);
	}

	let value: unknown;
	try {
		value = JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
	} catch {
		throw new Error('Request body must be valid JSON.');
	}
	const parsed = requestSchema.safeParse(value);
	if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Invalid request body.');
	return parsed.data;
}
