export function isExternalHref(href: string | undefined): boolean {
	if (!href) return false;
	return /^(https?:|mailto:)/i.test(href);
}

export function openExternalUrl(url: string): Promise<void> {
	return window.app.openExternalUrl(url);
}

export function handleExternalLinkClick(event: React.MouseEvent<HTMLAnchorElement>): void {
	const href = event.currentTarget.href;
	if (!isExternalHref(href)) return;
	event.preventDefault();
	void openExternalUrl(href);
}
