import type { AgentTool } from '../tools/types';
import { textResult } from '../tools/types';
import type { BrowserService } from './service';

const DEFAULT_PROFILE = 'default';

interface BrowserToolArgs {
	action: string;
	url?: string;
	targetUrl?: string;
	targetId?: string;
	profile?: string;
	label?: string;
	target?: 'host' | 'sandbox' | 'node';
	timeoutMs?: number;
	request?: Record<string, unknown>;
}

export function createBrowserTool(service: BrowserService): AgentTool<BrowserToolArgs> {
	return {
		name: 'browser',
		description:
			'Control a web browser for automation: open URLs, take screenshots, inspect pages, interact with elements.',
		schema: {
			type: 'object',
			required: ['action'],
			properties: {
				action: {
					type: 'string',
					enum: [
						'status',
						'start',
						'stop',
						'profiles',
						'tabs',
						'open',
						'navigate',
						'focus',
						'close',
						'snapshot',
						'screenshot',
						'act',
					],
					description:
						'status: browser state. start/stop: lifecycle. open: new tab with url. navigate: load url in current tab. snapshot: page accessibility tree (use before act). screenshot: page image. act: interact with element using ref from snapshot.',
				},
				url: { type: 'string', description: 'URL for open or navigate.' },
				targetUrl: { type: 'string', description: 'Alias for url.' },
				targetId: {
					type: 'string',
					description: 'Tab id (e.g. t1) returned by open/navigate. Omit to use last active tab.',
				},
				profile: { type: 'string', description: 'Browser profile name. Defaults to "default".' },
				label: { type: 'string', description: 'Human-readable tab label for open.' },
				target: {
					type: 'string',
					enum: ['host', 'sandbox', 'node'],
					description: 'Reserved backend target selector. Defaults to the managed host browser service.',
				},
				timeoutMs: { type: 'number' },
				request: {
					type: 'object',
					description:
						'For act: { type: "click"|"fill"|"press"|"select"|"scroll", ref: "role/name or css-selector or text", value?, key?, direction?, amount? }',
				},
			},
			additionalProperties: false,
		},

		async execute(args) {
			const action = String(args.action ?? '');
			const profile = String(args.profile ?? DEFAULT_PROFILE);
			const url = String(args.targetUrl ?? args.url ?? '');
			const targetId = args.targetId !== undefined ? String(args.targetId) : undefined;

			try {
				switch (action) {
					case 'status': {
						const s = await service.status(profile);
						return textResult(JSON.stringify(s, null, 2));
					}
					case 'start': {
						await service.start(profile);
						const s = await service.status(profile);
						return textResult(JSON.stringify(s, null, 2));
					}
					case 'stop': {
						const stopped = await service.stop(profile);
						return textResult(JSON.stringify({ ok: true, stopped }));
					}
					case 'profiles': {
						return textResult(JSON.stringify({ profiles: service.profiles() }, null, 2));
					}
					case 'tabs': {
						const result = await service.tabs(profile);
						return textResult(JSON.stringify(result, null, 2));
					}
					case 'open': {
						if (!url) return textResult('url is required for open', true);
						const tab = await service.openTab(
							profile,
							url,
							args.label !== undefined ? String(args.label) : undefined,
						);
						return textResult(JSON.stringify(tab, null, 2));
					}
					case 'navigate': {
						if (!url) return textResult('url is required for navigate', true);
						const result = await service.navigate(profile, targetId, url);
						return textResult(JSON.stringify(result, null, 2));
					}
					case 'focus': {
						if (!targetId) return textResult('targetId is required for focus', true);
						await service.focus(profile, targetId);
						return textResult(JSON.stringify({ ok: true }));
					}
					case 'close': {
						if (!targetId) return textResult('targetId is required for close', true);
						await service.close(profile, targetId);
						return textResult(JSON.stringify({ ok: true }));
					}
					case 'snapshot': {
						const snap = await service.snapshot(profile, targetId);
						return textResult(snap);
					}
					case 'screenshot': {
						const buf = await service.screenshot(profile, targetId);
						return {
							status: 'ok',
							content: [
								{ type: 'text', text: `Screenshot — profile: ${profile}, tab: ${targetId ?? 'current'}` },
								{ type: 'image', mimeType: 'image/png', base64: buf.toString('base64') },
							],
						};
					}
					case 'act': {
						const request = (args.request ?? {}) as Record<string, unknown>;
						const result = await service.act(profile, targetId, request);
						return textResult(JSON.stringify(result, null, 2));
					}
					default:
						return textResult(`unknown action: ${action}`, true);
				}
			} catch (err) {
				return textResult(`browser: ${err instanceof Error ? err.message : String(err)}`, true);
			}
		},
	};
}
