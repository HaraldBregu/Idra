import { createHash } from 'node:crypto';

const MAX_NAME_LENGTH = 64;

export function mcpToolName(
	serverId: string,
	toolName: string,
	usedNames: ReadonlySet<string>
): string {
	const server =
		serverId
			.normalize('NFKC')
			.replace(/[^a-zA-Z0-9_-]/g, '_')
			.replace(/_+/g, '_')
			.replace(/^_+|_+$/g, '') || 'server';
	const tool =
		toolName
			.normalize('NFKC')
			.replace(/[^a-zA-Z0-9_-]/g, '_')
			.replace(/_+/g, '_')
			.replace(/^_+|_+$/g, '') || 'tool';
	const base = `mcp__${server}__${tool}`;
	let candidate = base;
	let attempt = 0;
	while (candidate.length > MAX_NAME_LENGTH || usedNames.has(candidate)) {
		const hash = createHash('sha256')
			.update(`${serverId}\0${toolName}\0${attempt}`)
			.digest('hex')
			.slice(0, 10);
		const suffix = `__${hash}`;
		candidate = `${base.slice(0, MAX_NAME_LENGTH - suffix.length)}${suffix}`;
		attempt += 1;
	}
	return candidate;
}
