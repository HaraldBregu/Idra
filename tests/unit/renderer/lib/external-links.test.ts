import { normalizeExternalUrl } from '../../../../src/shared/external-links';
import {
	handleExternalLinkClick,
	openExternalUrl,
} from '../../../../src/renderer/src/lib/external-links';

describe('external links', () => {
	beforeEach(() => {
		Object.defineProperty(window, 'app', {
			configurable: true,
			value: {
				openExternalUrl: jest.fn(async () => undefined),
			},
		});
	});

	it('normalizes only HTTP and HTTPS URLs', () => {
		expect(normalizeExternalUrl(' https://example.com/docs ')).toBe('https://example.com/docs');
		expect(normalizeExternalUrl('http://example.com')).toBe('http://example.com/');
		expect(normalizeExternalUrl('javascript:alert(1)')).toBeNull();
		expect(normalizeExternalUrl('file:///tmp/readme.md')).toBeNull();
		expect(normalizeExternalUrl('/relative/path')).toBeNull();
	});

	it('opens normalized external URLs through the renderer bridge', () => {
		openExternalUrl('https://example.com/docs');

		expect(window.app.openExternalUrl).toHaveBeenCalledWith('https://example.com/docs');
	});

	it('prevents browser navigation for handled external links', () => {
		const event = {
			button: 0,
			defaultPrevented: false,
			preventDefault: jest.fn(),
		} as unknown as React.MouseEvent<HTMLAnchorElement>;

		handleExternalLinkClick(event, 'https://example.com/docs');

		expect(event.preventDefault).toHaveBeenCalled();
		expect(window.app.openExternalUrl).toHaveBeenCalledWith('https://example.com/docs');
	});

	it('ignores unsupported URLs', () => {
		const event = {
			button: 0,
			defaultPrevented: false,
			preventDefault: jest.fn(),
		} as unknown as React.MouseEvent<HTMLAnchorElement>;

		handleExternalLinkClick(event, 'javascript:alert(1)');

		expect(event.preventDefault).not.toHaveBeenCalled();
		expect(window.app.openExternalUrl).not.toHaveBeenCalled();
	});
});
