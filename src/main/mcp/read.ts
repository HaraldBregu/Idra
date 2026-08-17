import fs from 'node:fs';
import { mcpPath } from './path';
import { parseMcp } from './parse';
import type { McpDocument } from './types';

export function readMcp(dataDirectory: string): McpDocument {
	const filePath = mcpPath(dataDirectory);
	if (!fs.existsSync(filePath)) return { servers: [] };
	if (fs.lstatSync(filePath).isSymbolicLink()) {
		throw new Error('MCP configuration cannot be a symbolic link.');
	}
	return parseMcp(JSON.parse(fs.readFileSync(filePath, 'utf8')));
}
