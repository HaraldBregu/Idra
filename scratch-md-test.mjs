import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

const winPath = 'C:\\Users\\BRGHLD87H\\AppData\\friday\\resources\\image-123.png';
const winPathSpaces = 'C:\\Users\\BRGHLD87H\\OneDrive - DEDA\\friday\\resources\\image-123.png';
const posixPath = '/Users/harald/friday/resources/image-123.png';

for (const [label, p] of [['win', winPath], ['win+spaces', winPathSpaces], ['posix', posixPath]]) {
	const md = `![Generated image](${p})`;
	const html = renderToStaticMarkup(
		createElement(ReactMarkdown, { remarkPlugins: [remarkGfm, remarkBreaks] }, md)
	);
	console.log(`--- ${label} ---`);
	console.log('input :', md);
	console.log('html  :', html);
	console.log('urlTransform("' + p + '") =>', JSON.stringify(defaultUrlTransform(p)));
	console.log();
}
