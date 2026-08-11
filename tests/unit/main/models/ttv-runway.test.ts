import { createRunwayVideoAdapter } from '../../../../src/main/models/adapters/ttv/ttv_runway';

const originalFetch = global.fetch;

beforeEach(() => {
	global.fetch = jest
		.fn()
		.mockResolvedValue(
			new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
		);
});

afterEach(() => {
	global.fetch = originalFetch;
});

it.each([
	['gen4.5', 5],
	['hailuo3', 6],
	['veo3.1', 8],
	['veo3.1_fast', 8],
])('uses a valid default duration for %s', async (modelId, duration) => {
	const adapter = createRunwayVideoAdapter({
		id: 'runway',
		name: 'Runway',
		apiKey: 'secret',
	});

	await expect(adapter.generate({ modelId, prompt: 'sunrise' })).rejects.toThrow(
		'Runway: generation was not accepted.'
	);

	const [, init] = jest.mocked(global.fetch).mock.calls[0] ?? [];
	expect(JSON.parse(String(init?.body))).toEqual({
		model: modelId,
		promptText: 'sunrise',
		ratio: '1280:720',
		duration,
	});
});
