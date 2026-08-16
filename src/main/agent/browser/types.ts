export type BrowserAction =
	'navigate' | 'snapshot' | 'click' | 'type' | 'press' | 'screenshot' | 'back' | 'reload' | 'close';

export interface BrowserInput {
	action: BrowserAction;
	url?: string;
	selector?: string;
	text?: string;
	key?: string;
	path?: string;
	submit?: boolean;
	fullPage?: boolean;
}
