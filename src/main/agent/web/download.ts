import { publicWebUrl } from './address';

const MAX_DOWNLOAD_BYTES = 2_000_000;
const MAX_REDIRECTS = 5;

type Fetcher = (input: string | URL, init?: RequestInit) => Promise<Response>;
type Validator = (rawUrl: string) => Promise<URL>;

export interface WebsiteDownload {
	body: string;
	contentType: string;
	status: number;
	url: string;
}

export async function downloadWebsite(
	rawUrl: string,
	fetcher: Fetcher = fetch,
	validate: Validator = publicWebUrl
): Promise<WebsiteDownload> {
	let url = await validate(rawUrl);
	for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
		const response = await fetcher(url, {
			headers: {
				accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1',
				'user-agent': 'Idra/1.0 website scraper',
			},
			redirect: 'manual',
			signal: AbortSignal.timeout(20_000),
		});
		if ([301, 302, 303, 307, 308].includes(response.status)) {
			const location = response.headers.get('location');
			if (!location) throw new Error('Website redirect did not include a location.');
			if (redirect === MAX_REDIRECTS) throw new Error('Website redirected too many times.');
			url = await validate(new URL(location, url).toString());
			continue;
		}

		const declaredLength = Number(response.headers.get('content-length') ?? 0);
		if (declaredLength > MAX_DOWNLOAD_BYTES) throw new Error('Website response exceeds 2 MiB.');
		const reader = response.body?.getReader();
		const chunks: Uint8Array[] = [];
		let length = 0;
		while (reader) {
			const chunk = await reader.read();
			if (chunk.done) break;
			length += chunk.value.byteLength;
			if (length > MAX_DOWNLOAD_BYTES) {
				await reader.cancel();
				throw new Error('Website response exceeds 2 MiB.');
			}
			chunks.push(chunk.value);
		}
		return {
			body: Buffer.concat(chunks, length).toString('utf8'),
			contentType: response.headers.get('content-type') ?? '',
			status: response.status,
			url: url.toString(),
		};
	}
	throw new Error('Website redirected too many times.');
}
