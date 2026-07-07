import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

function spy(url) {
	console.log('  urlTransform received:', JSON.stringify(url));
	return url; // preserve everything for inspection
}

const cases = [
	['win-backslash', 'C:\\Users\\BRGHLD87H\\AppData\\friday\\resources\\image-123.png'],
	['win-forwardslash', 'C:/Users/BRGHLD87H/AppData/friday/resources/image-123.png'],
	['win-backslash-angle', '<C:\\Users\\BRGHLD87H\\OneDrive - X\\friday\\image-123.png>'],
	['local-resource-url', 'local-resource://file/C:/Users/BRGHLD87H/AppData/friday/image-123.png'],
];

for (const [label, dest] of cases) {
	console.log(`--- ${label} ---`);
	const content = `![alt](${dest})`;
	const html = renderToStaticMarkup(
		createElement(
			ReactMarkdown,
			{ remarkPlugins: [remarkGfm, remarkBreaks], urlTransform: spy },
			content
		)
	);
	console.log('  html:', html);
	console.log();
}
