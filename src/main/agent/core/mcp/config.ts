import path from 'node:path';
import { SettingsService } from '../../../shared/settings';
import type { McpServerConfig } from './types';

export function mcpConfig(location: string, enabled?: boolean): McpServerConfig[] {
	const configured =
		enabled ?? new SettingsService().get<{ playwright?: boolean }>('mcp')?.playwright;
	if (process.env.IDRA_PLAYWRIGHT_MCP !== 'true' && configured !== true) return [];
	return [
		{
			id: 'playwright',
			command: process.execPath,
			args: [
				path.resolve(process.cwd(), 'node_modules', '@playwright', 'mcp', 'cli.js'),
				'--headless',
				'--isolated',
			],
			cwd: path.resolve(location),
			...(process.env.PLAYWRIGHT_BROWSERS_PATH
				? { env: { PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH } }
				: {}),
		},
	];
}
