const registerCommand = jest.fn();
const registerCommandWithEvent = jest.fn();
const registerQuery = jest.fn();
const getModelId = jest.fn();
const getOptions = jest.fn();
const getProviderId = jest.fn();
const setModelId = jest.fn();
const setOptions = jest.fn();
const setProviderId = jest.fn();
const getRealtimeVoiceSetup = jest.fn();
const setRealtimeVoiceSetup = jest.fn();

jest.mock('../../../../src/main/ipc/core/gateway', () => ({
	registerCommand,
	registerCommandWithEvent,
	registerQuery,
}));
jest.mock('../../../../src/main/models/index', () => ({
	embedding: { createEmbedding: jest.fn() },
	image: { createImage: jest.fn() },
	sound: { createSound: jest.fn(), listSounds: jest.fn(), saveSoundFile: jest.fn() },
	text: { generateText: jest.fn() },
	video: { createVideo: jest.fn(), saveVideoFile: jest.fn() },
	voice: { synthesize: jest.fn() },
}));
jest.mock('../../../../src/main/models/models_store', () => ({
	getModelId,
	getOptions,
	getProviderId,
	setModelId,
	setOptions,
	setProviderId,
}));
jest.mock('../../../../src/main/models/adapters/stt', () => ({
	appendRealtimeAudio: jest.fn(),
	cancelRealtime: jest.fn(),
	finishRealtime: jest.fn(),
	getSelection: jest.fn(),
	listModels: jest.fn(),
	listProviders: jest.fn(),
	saveSelection: jest.fn(),
	startRealtime: jest.fn(),
	transcribe: jest.fn(),
}));
jest.mock('../../../../src/main/realtime_voice/setup', () => ({
	getRealtimeVoiceSetup,
	setRealtimeVoiceSetup,
}));

import { ModelsIpc } from '../../../../src/main/ipc/models';
import { RealtimeVoiceChannels } from '../../../../src/shared/ipc_channels_definitions';

function command(channel: string): (...args: unknown[]) => unknown {
	return registerCommand.mock.calls.find(([registered]) => registered === channel)?.[1];
}

function query(channel: string): (...args: unknown[]) => unknown {
	return registerQuery.mock.calls.find(([registered]) => registered === channel)?.[1];
}

beforeEach(() => {
	jest.clearAllMocks();
	new ModelsIpc().register(undefined, {} as never);
});

it('wires realtime voice selection and options to their distinct model kind', () => {
	getOptions.mockReturnValue({ voice: 'marin' });
	command(RealtimeVoiceChannels.setProviderId)(' openai ');
	command(RealtimeVoiceChannels.setModelId)(' gpt-realtime-2.1 ');
	const result = command(RealtimeVoiceChannels.setOptions)({ voice: 'cedar' });

	expect(setProviderId).toHaveBeenCalledWith('realtimeVoice', 'openai');
	expect(setModelId).toHaveBeenCalledWith('realtimeVoice', 'gpt-realtime-2.1');
	expect(setOptions).toHaveBeenCalledWith('realtimeVoice', { voice: 'cedar' });
	expect(result).toEqual({ voice: 'marin' });
});

it('registers the atomic realtime voice setup API', () => {
	const setup = { options: {}, supportedModels: [] };
	const request = { providerId: 'openai', modelId: 'gpt-realtime', options: {} };
	getRealtimeVoiceSetup.mockReturnValue(setup);
	setRealtimeVoiceSetup.mockReturnValue({ ...setup, ...request });

	expect(query(RealtimeVoiceChannels.getSetup)()).toBe(setup);
	expect(command(RealtimeVoiceChannels.setSetup)(request)).toEqual({ ...setup, ...request });
	expect(setRealtimeVoiceSetup).toHaveBeenCalledWith(request);
});

it('rejects unsafe realtime voice selection inputs in main', () => {
	expect(() => command(RealtimeVoiceChannels.setProviderId)(null)).toThrow(
		'Invalid realtime voice provider id.'
	);
	expect(() => command(RealtimeVoiceChannels.setModelId)([])).toThrow(
		'Invalid realtime voice model id.'
	);
	expect(() => command(RealtimeVoiceChannels.setOptions)('marin')).toThrow(
		'Invalid realtime voice options.'
	);
});
