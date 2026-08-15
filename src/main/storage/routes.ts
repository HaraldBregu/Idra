import { timingSafeEqual } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { deleteFile } from './file_delete';
import { listFiles } from './file_list';
import { readFile } from './file_read';
import { writeFile } from './file_write';
import { deleteSettings } from './settings_delete';
import { readSettings } from './settings_read';
import { writeSettings } from './settings_write';
import { storageStatus } from './status';
import type { StoredSettings } from './types';

interface FileQuery {
	path?: string;
}

interface FileBody {
	path: string;
	content: string;
}

interface SettingsBody {
	settings: StoredSettings;
}

export function registerStorageRoutes(
	server: FastifyInstance,
	dataDirectory: string,
	adminToken: string
): void {
	const expectedAuthorization = Buffer.from(`Bearer ${adminToken}`);
	const authenticate = async (
		request: { headers: { authorization?: string } },
		reply: {
			code(statusCode: number): {
				header(name: string, value: string): { send(payload: object): unknown };
			};
		}
	): Promise<unknown> => {
		const authorization = Buffer.from(request.headers.authorization ?? '');
		if (
			authorization.length !== expectedAuthorization.length ||
			!timingSafeEqual(authorization, expectedAuthorization)
		) {
			return reply.code(401).header('www-authenticate', 'Bearer').send({ error: 'Unauthorized' });
		}
	};

	server.get('/storage', { onRequest: authenticate }, async () => storageStatus(dataDirectory));

	server.get('/settings', { onRequest: authenticate }, async () => readSettings(dataDirectory));
	server.put<{ Body: SettingsBody }>(
		'/settings',
		{
			onRequest: authenticate,
			schema: {
				body: {
					type: 'object',
					required: ['settings'],
					additionalProperties: false,
					properties: { settings: { type: 'object', additionalProperties: true } },
				},
			},
		},
		async (request) => {
			writeSettings(dataDirectory, request.body.settings);
			return readSettings(dataDirectory);
		}
	);
	server.delete('/settings', { onRequest: authenticate }, async () => ({
		deleted: deleteSettings(dataDirectory),
	}));

	server.get<{ Querystring: FileQuery }>(
		'/files',
		{
			onRequest: authenticate,
			schema: {
				querystring: {
					type: 'object',
					additionalProperties: false,
					properties: { path: { type: 'string', minLength: 1 } },
				},
			},
		},
		async (request) => {
			return request.query.path
				? { file: readFile(dataDirectory, request.query.path) }
				: { files: listFiles(dataDirectory) };
		}
	);
	server.put<{ Body: FileBody }>(
		'/files',
		{
			onRequest: authenticate,
			schema: {
				body: {
					type: 'object',
					required: ['path', 'content'],
					additionalProperties: false,
					properties: {
						path: { type: 'string', minLength: 1 },
						content: { type: 'string' },
					},
				},
			},
		},
		async (request, reply) => {
			const result = await writeFile(dataDirectory, request.body.path, request.body.content);
			return reply.code(result.created ? 201 : 200).send(result);
		}
	);
	server.delete<{ Querystring: Required<FileQuery> }>(
		'/files',
		{
			onRequest: authenticate,
			schema: {
				querystring: {
					type: 'object',
					required: ['path'],
					additionalProperties: false,
					properties: { path: { type: 'string', minLength: 1 } },
				},
			},
		},
		async (request) => ({ deleted: deleteFile(dataDirectory, request.query.path) })
	);
}
