import { z } from 'zod';
import { browserController } from '../browser/controller';
import { tool } from '../core/tool';

export const browserTool = tool({
	id: 'browser',
	name: 'Control browser',
	description:
		'Control a persistent Playwright Chromium page. Use navigate or snapshot to inspect it, then target elements with Playwright selectors such as role=button[name="Submit"].',
	inputSchema: z.object({
		action: z.enum([
			'navigate',
			'snapshot',
			'click',
			'type',
			'press',
			'screenshot',
			'back',
			'reload',
			'close',
		]),
		url: z.url().optional().describe('Public HTTP(S) URL required by navigate.'),
		selector: z
			.string()
			.min(1)
			.max(1_000)
			.optional()
			.describe('Playwright selector required by click and type; optional for press.'),
		text: z.string().max(100_000).optional().describe('Text required by type.'),
		key: z.string().min(1).max(100).optional().describe('Keyboard key required by press.'),
		path: z
			.string()
			.min(1)
			.max(500)
			.optional()
			.describe('Workspace-relative PNG path for screenshot. Defaults to browser.png.'),
		submit: z.boolean().optional().describe('Press Enter after type when true.'),
		fullPage: z.boolean().optional().describe('Capture the full page for screenshot.'),
	}),
	execute: (input) => browserController.run(input),
});
