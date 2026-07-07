import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

// ---- final helper implementations ----

function localResourceUrl(path) {
	const posixPath = path.replace(/\\/g, '/');
	const absolutePath = posixPath.startsWith('/') ? posixPath : `/${posixPath}`;
	return `local-resource://file${encodeURI(absolutePath)}`;
}

function isLocalImagePath(value) {
	return /^[A-Za-z]:[\\/]/.test(value) || value.startsWith('\\\\') || value.startsWith('/');
}

function preserveLocalImageUrl(url) {
	return isLocalImagePath(url) ? url : defaultUrlTransform(url);
}

function resolveLocalImagePath(src, imagePaths) {
	if (!src) return undefined;
	const isWindowsDrivePath = /^[A-Za-z]:[\\/]/.test(src);
	if (!isWindowsDrivePath && /^[a-z][a-z0-9+.-]*:/i.test(src)) return undefined;
	let decoded = src;
	try {
		decoded = decodeURIComponent(src);
	} catch {
		// keep src as-is
	}
	const decodedPosix = decoded.replace(/\\/g, '/');
	const matched = imagePaths.find((path) => {
		const posix = path.replace(/\\/g, '/');
		return posix === decodedPosix || posix.endsWith(`/${decodedPosix}`);
	});
	if (matched) return matched;
	return isLocalImagePath(decodedPosix) ? decoded : undefined;
}

function normalizeImageLinks(content) {
	return content.replace(/!\[([^\]]*)\]\(([^()\n]+)\)/g, (match, alt, dest) => {
		let destination = dest.trim().replace(/^file:\/\//i, '');
		if (isLocalImagePath(destination)) {
			destination = destination.replace(/\\/g, '/');
		}
		if (destination.includes(' ') && !destination.startsWith('<')) {
			destination = `<${destination}>`;
		}
		return destination === dest.trim() ? match : `![${alt}](${destination})`;
	});
}

function Img({ src, alt, imagePaths }) {
	const localPath = resolveLocalImagePath(src, imagePaths);
	return createElement('img', { src: localPath ? localResourceUrl(localPath) : src, alt: alt ?? '' });
}

const cases = [
	['win full path', 'C:\\Users\\BRGHLD87H\\AppData\\friday\\resources\\image-123.png'],
	['win path w/ spaces', 'C:\\Users\\BRGHLD87H\\OneDrive - DEDAGROUP SPA\\friday\\resources\\image-123.png'],
	['posix', '/Users/harald/friday/resources/image-123.png'],
];

let allOk = true;
for (const [label, p] of cases) {
	const imagePaths = [p];
	const content = normalizeImageLinks(`Here is your image:\n\n![Generated image](${p})`);
	const html = renderToStaticMarkup(
		createElement(
			ReactMarkdown,
			{
				remarkPlugins: [remarkGfm, remarkBreaks],
				urlTransform: preserveLocalImageUrl,
				components: { img: (props) => createElement(Img, { ...props, imagePaths }) },
			},
			content
		)
	);
	const m = html.match(/<img src="([^"]*)"/);
	const src = m ? m[1] : '(none)';
	const ok = src.startsWith('local-resource://file/');
	allOk = allOk && ok;
	console.log(`[${ok ? 'OK' : 'FAIL'}] ${label}`);
	console.log('      src =', src);
}
console.log(allOk ? '\nALL PASS' : '\nFAILURES');
