export function isExternalHref(href) {
    if (!href)
        return false;
    return /^(https?:|mailto:)/i.test(href);
}
export function openExternalUrl(url) {
    return window.app.openExternalUrl(url);
}
export function handleExternalLinkClick(event, href = event.currentTarget.href) {
    if (!isExternalHref(href))
        return;
    event.preventDefault();
    void openExternalUrl(href);
}
