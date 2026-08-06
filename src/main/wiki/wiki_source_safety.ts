import path from 'node:path';

interface SourceSafetyInput {
	readonly relativePath: string;
	readonly content: string;
}

const SECRET_FILE = /(^|\/)(\.env(?:\.|$)|credentials\.json$|id_rsa$|[^/]+\.(?:pem|key|p12|pfx)$)/i;
const PRIVATE_KEY = /-----BEGIN [A-Z ]*PRIVATE KEY-----/;
const ASSIGNED_SECRET =
	/(?:api[_-]?key|access[_-]?token|client[_-]?secret|password)\s*[:=]\s*["']?[A-Za-z0-9_\-/.+=]{20,}/i;

export function assertWikiSourceSafe(source: SourceSafetyInput): void {
	const normalized = source.relativePath.split(path.sep).join('/');
	if (SECRET_FILE.test(normalized))
		throw new Error(`Refusing to ingest credential-like file: ${normalized}`);
	if (PRIVATE_KEY.test(source.content) || ASSIGNED_SECRET.test(source.content)) {
		throw new Error(`Refusing to ingest source containing credential-like content: ${normalized}`);
	}
}
