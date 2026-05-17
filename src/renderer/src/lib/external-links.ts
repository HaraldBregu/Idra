import type React from 'react';
import { normalizeExternalUrl } from '../../../shared/external-links';

export function isExternalHref(href: string | undefined): boolean {
	return Boolean(href && normalizeExternalUrl(href));
}

export function openExternalUrl(href: string): void {
	const externalUrl = normalizeExternalUrl(href);
	if (!externalUrl) return;

	void window.app.openExternalUrl(externalUrl).catch((error) => {
		console.error('[renderer] Failed to open external URL:', error);
	});
}

export function handleExternalLinkClick(
	event: React.MouseEvent<HTMLAnchorElement>,
	href: string | undefined
): void {
	const externalUrl = href ? normalizeExternalUrl(href) : null;
	if (!externalUrl || event.defaultPrevented || event.button !== 0) return;

	event.preventDefault();
	openExternalUrl(externalUrl);
}
