export function isExternalHref(href: string | undefined): boolean {
	if (!href) return false;
	return /^(https?:|mailto:)/i.test(href);
}

export function openExternalUrl(url: string): Promise<void> {
	return window.app.openExternalUrl(url);
}

import type { MouseEvent } from 'react';

export function handleExternalLinkClick(
	event: MouseEvent<HTMLAnchorElement>,
	href = event.currentTarget.href
): void {
	if (!isExternalHref(href)) return;
	event.preventDefault();
	void openExternalUrl(href);
}
