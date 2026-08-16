import assert from 'node:assert/strict';
import test from 'node:test';
import { downloadWebsite } from '../src/main/agent/web/download';
import { extractWebsite } from '../src/main/agent/web/extract';
import { publicWebUrl } from '../src/main/agent/web/address';
import { builtinTools } from '../src/main/agent/runner/builtin_tools';

test('web URL policy accepts public HTTP(S) hosts and rejects local destinations', async () => {
	const publicUrl = await publicWebUrl('https://public.example/path', async () => [
		{ address: '8.8.8.8', family: 4 },
	]);
	assert.equal(publicUrl.toString(), 'https://public.example/path');
	await assert.rejects(publicWebUrl('http://127.0.0.1/private'), /private or local/);
	await assert.rejects(publicWebUrl('http://localhost/private'), /public host/);
	await assert.rejects(publicWebUrl('ftp://public.example/file'), /HTTP or HTTPS/);
	await assert.rejects(publicWebUrl('https://user:secret@public.example'), /credentials/);
});

test('website downloader follows bounded redirects and enforces its byte limit', async () => {
	const requested: string[] = [];
	const fetcher = async (input: string | URL): Promise<Response> => {
		requested.push(input.toString());
		if (requested.length === 1) {
			return new Response(null, { status: 302, headers: { location: '/final' } });
		}
		return new Response('<main>done</main>', {
			status: 200,
			headers: { 'content-type': 'text/html' },
		});
	};
	const result = await downloadWebsite(
		'https://example.test/start',
		fetcher,
		async (url) => new URL(url)
	);
	assert.deepEqual(requested, ['https://example.test/start', 'https://example.test/final']);
	assert.equal(result.body, '<main>done</main>');

	await assert.rejects(
		downloadWebsite(
			'https://example.test/large',
			async () =>
				new Response('too large', {
					headers: { 'content-length': '2000001' },
				}),
			async (url) => new URL(url)
		),
		/exceeds 2 MiB/
	);
});

test('website extraction removes active content and returns bounded text and links', () => {
	const result = extractWebsite(
		'<title> Example </title><main><h1>Hello</h1><script>ignore me</script><p>World</p><a href="/next">Next</a></main>',
		'https://example.test/start',
		12
	);
	assert.equal(result.title, 'Example');
	assert.equal(result.text, 'Hello\nWorld\n[truncated]');
	assert.deepEqual(result.links, [{ text: 'Next', url: 'https://example.test/next' }]);
});

test('built-in tools expose website scraping', () => {
	assert.deepEqual(
		builtinTools().map((tool) => tool.id),
		['read_file', 'write_file', 'edit_file', 'apply_patch', 'execute_command', 'scrape_website']
	);
});
