import path from 'node:path';
import { SettingsService } from '../../../shared/settings';
import type { McpServerConfig } from './types';

export function mcpConfig(location: string, enabled?: boolean): McpServerConfig[] {
	const configured = enabled ?? new SettingsService().get<{ playwright?: boolean }>('mcp')?.playwright;
	if (process.env.IDRA_PLAYWRIGHT_MCP !== 'true' && configured !== true) return [];
	return [
		{
			id: 'playwright',
			command: 'npx',
			args: ['-y', '@playwright/mcp@0.0.68', '--headless', '--isolated'],
			cwd: path.resolve(location),
		},
	];
}
