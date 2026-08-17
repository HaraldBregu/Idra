import path from 'node:path';
import type { McpServerConfig } from './types';

export function mcpConfig(location: string): McpServerConfig[] {
	if (process.env.IDRA_PLAYWRIGHT_MCP !== 'true') return [];
	return [
		{
			id: 'playwright',
			command: 'npx',
			args: ['-y', '@playwright/mcp@0.0.68', '--headless', '--isolated'],
			cwd: path.resolve(location),
		},
	];
}
