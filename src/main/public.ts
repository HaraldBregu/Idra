import { lookup } from 'node:dns/promises';
import { privateAddress } from './private';

export async function publicUrl(value: string): Promise<URL> {
	const url = new URL(value);
	if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Unsupported URL.');
	const hostname = url.hostname.toLowerCase();
	if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
		throw new Error('Private URLs are not allowed.');
	}
	const addresses = await lookup(hostname, { all: true, verbatim: true });
	if (!addresses.length || addresses.some(({ address }) => privateAddress(address))) {
		throw new Error('Private URLs are not allowed.');
	}
	return url;
}
