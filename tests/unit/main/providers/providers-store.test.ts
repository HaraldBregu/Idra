jest.mock('electron-store', () =>
	jest.fn().mockImplementation(() => {
		let backing: unknown = {};
		return {
			get store() {
				return backing;
			},
			set store(value: unknown) {
				backing = value;
			},
		};
	})
);

import {
	listProviders,
	getProvider,
	hasProvider,
	setProvider,
	deleteProvider,
	clearProviders,
} from '../../../../src/main/providers/providers_store';
import type { StoredProvider as Provider } from '../../../../src/main/providers/provider_types';

function provider(name: string): Provider {
	return { name, apiKey: 'k', baseUrl: 'https://api' } as Provider;
}

beforeEach(() => clearProviders());

describe('providers store', () => {
	it('sets and reads a provider', () => {
		setProvider('openai', provider('OpenAI'));
		expect(getProvider('openai')).toEqual(provider('OpenAI'));
		expect(hasProvider('openai')).toBe(true);
	});

	it('returns undefined / false for unknown providers', () => {
		expect(getProvider('missing')).toBeUndefined();
		expect(hasProvider('missing')).toBe(false);
	});

	it('lists only well-formed provider entries', () => {
		setProvider('good', provider('Good'));
		// Inject a malformed entry directly through the store shape.
		setProvider('bad', { name: 'Bad' } as Provider);
		const list = listProviders();
		expect(list).toHaveProperty('good');
		expect(list).not.toHaveProperty('bad');
	});

	it('deletes a provider', () => {
		setProvider('x', provider('X'));
		deleteProvider('x');
		expect(hasProvider('x')).toBe(false);
	});

	it('deleteProvider is a no-op for unknown ids', () => {
		expect(() => deleteProvider('nope')).not.toThrow();
	});

	it('clears all providers', () => {
		setProvider('a', provider('A'));
		clearProviders();
		expect(listProviders()).toEqual({});
	});
});
