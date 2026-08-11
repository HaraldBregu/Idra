jest.mock('electron-store', () =>
	jest.fn().mockImplementation((options: { defaults?: unknown }) => {
		let backing = structuredClone(options.defaults ?? {});
		return {
			get(key: string) {
				return (backing as Record<string, unknown>)[key];
			},
			set(key: string, value: unknown) {
				(backing as Record<string, unknown>)[key] = value;
			},
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
	getModelId,
	getMediaModel,
	getPermissions,
	getProviderId,
	getSearchEngine,
	resetPermissions,
	setDirectoryPermissions,
	setModelId,
	setMediaModel,
	setProviderId,
	setSearchEngine,
	setToolPermission,
} from '../../../../../src/main/agent/agent_store';

beforeEach(() => {
	resetPermissions();
	setMediaModel('image', { providerId: '', modelId: '', options: {} });
	setMediaModel('audio', { providerId: '', modelId: '', options: {} });
	setMediaModel('video', { providerId: '', modelId: '', options: {} });
	setMediaModel('realtimeVoice', { providerId: '', modelId: '', options: {} });
});

describe('agent store permissions', () => {
	it('preserves normalized directory entries when a tool changes', () => {
		setDirectoryPermissions([
			{
				path: ' /shared ',
				enabled: true,
				recoursive: true,
				tools: [' read_file ', 'read_file'],
			},
		]);
		const permission = setToolPermission('read_file', {
			default: 'ask',
			allow: [],
			deny: [],
			ask: [],
		});

		expect(permission.directories).toEqual([
			{
				path: '/shared',
				enabled: true,
				recoursive: true,
				tools: ['read_file'],
			},
		]);
		expect(permission.tools.read_file).toEqual({
			default: 'ask',
			allow: [],
			deny: [],
			ask: [],
		});
	});

	it('resets directory permissions to an empty list', () => {
		setDirectoryPermissions([
			{ path: '/shared', enabled: true, recoursive: true, tools: '*' },
		]);
		expect(getPermissions().directories).not.toEqual([]);
		expect(resetPermissions().directories).toEqual([]);
	});

	it('preserves the other agent settings when permissions change', () => {
		setProviderId('provider');
		setModelId('model');
		setSearchEngine({ providerId: 'search', providerName: 'Search', enabled: true });
		setMediaModel('image', {
			providerId: 'google',
			modelId: 'gemini-image',
			options: { aspectRatio: '16:9' },
		});

		expect(getProviderId()).toBe('provider');
		expect(getModelId()).toBe('model');
		expect(getSearchEngine()).toEqual({
			providerId: 'search',
			providerName: 'Search',
			enabled: true,
		});
		expect(getMediaModel('image')).toEqual({
			providerId: 'google',
			modelId: 'gemini-image',
			options: { aspectRatio: '16:9' },
		});
	});

	it('persists media model settings independently', () => {
		setMediaModel('image', {
			providerId: 'google',
			modelId: 'gemini-image',
			options: { imageSize: '2K' },
		});
		setMediaModel('audio', {
			providerId: 'elevenlabs',
			modelId: 'eleven-music',
			options: { force_instrumental: true },
		});
		setMediaModel('video', {
			providerId: 'google',
			modelId: 'veo-3.1',
			options: { durationSeconds: 8 },
		});
		setMediaModel('realtimeVoice', {
			providerId: 'openai',
			modelId: 'gpt-realtime-2.1',
			options: { voice: 'marin' },
		});

		expect(getMediaModel('image')).toEqual({
			providerId: 'google',
			modelId: 'gemini-image',
			options: { imageSize: '2K' },
		});
		expect(getMediaModel('audio')).toEqual({
			providerId: 'elevenlabs',
			modelId: 'eleven-music',
			options: { force_instrumental: true },
		});
		expect(getMediaModel('video')).toEqual({
			providerId: 'google',
			modelId: 'veo-3.1',
			options: { durationSeconds: 8 },
		});
		expect(getMediaModel('realtimeVoice')).toEqual({
			providerId: 'openai',
			modelId: 'gpt-realtime-2.1',
			options: { voice: 'marin' },
		});
	});
});
