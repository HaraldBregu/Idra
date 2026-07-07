import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

// --- candidate helpers (mirror what I'll put in the app) ---

function localResourceUrl(path) {
	const posixPath = path.replace(/\\/g, '/');
	const absolutePath = posixPath.startsWith('/') ? posixPath : `/${posixPath}`;
	return `local-resource://file${encodeURI(absolutePath)}`;
}

function isLocalImagePath(src) {
	if (!src) return false;
	if (/^[A-Za-z]:[\\/]/.test(src)) return true; // Windows drive path
	if (src.startsWith('\\\\')) return true; // Windows UNC
	if (src.startsWith('/')) return true; // POSIX absolute
	return false;
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
		// keep as-is
	}
	return (
		imagePaths.find((path) => path === decoded || path.endsWith(`/${decoded}`)) ??
		(isLocalImagePath(decoded) ? decoded : undefined)
	);
}

// --- normalizeImageLinks (unchanged from app) ---
function normalizeImageLinks(content) {
	return content.replace(/!\[([^\]]*)\]\(([^()\n]+)\)/g, (match, alt, dest) => {
		let destination = dest.trim().replace(/^file:\/\//i, '');
		if (destination.includes(' ') && !destination.startsWith('<')) {
			destination = `<${destination}>`;
		}
		return destination === dest.trim() ? match : `![${alt}](${destination})`;
	});
}

function Img({ src, alt, imagePaths }) {
	const localPath = resolveLocalImagePath(src, imagePaths);
	return createElement('img', {
		src: localPath ? localResourceUrl(localPath) : src,
		alt: alt ?? '',
	});
}

const cases = [
	['win', 'C:\\Users\\BRGHLD87H\\AppData\\friday\\resources\\image-123.png'],
	['win+spaces', 'C:\\Users\\BRGHLD87H\\OneDrive - DEDAGROUP SPA\\friday\\resources\\image-123.png'],
	['posix', '/Users/harald/friday/resources/image-123.png'],
];

for (const [label, p] of cases) {
	const imagePaths = [p];
	const raw = `Here is your image:\n\n![Generated image](${p})`;
	const content = normalizeImageLinks(raw);
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
	console.log(`--- ${label} ---`);
	console.log('normalized:', JSON.stringify(content));
	console.log('html      :', html);
	console.log();
}
