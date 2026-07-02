export { AgentChannels } from './ipc_channels_agent';
export { AppChannels } from './ipc_channels_app';
export { ChannelsChannels } from './ipc_channels_channels';
export { ProviderStoreChannels } from './ipc_channels_provider';
export { SpeechChannels } from './ipc_channels_speech';
export { SttChannels } from './ipc_channels_stt';
export { WindowChannels } from './ipc_channels_window';

import type { AgentEventChannelMap, AgentInvokeChannelMap } from './ipc_channels_agent';
import type { AppInvokeChannelMap } from './ipc_channels_app';
import type {
	ChannelsEventChannelMap,
	ChannelsInvokeChannelMap,
} from './ipc_channels_channels';
import type { ProviderStoreInvokeChannelMap } from './ipc_channels_provider';
import type { SpeechInvokeChannelMap } from './ipc_channels_speech';
import type { SttEventChannelMap, SttInvokeChannelMap } from './ipc_channels_stt';
import type {
	WindowEventChannelMap,
	WindowInvokeChannelMap,
	WindowSendChannelMap,
} from './ipc_channels_window';

export interface InvokeChannelMap
	extends AppInvokeChannelMap,
		AgentInvokeChannelMap,
		ProviderStoreInvokeChannelMap,
		WindowInvokeChannelMap,
		ChannelsInvokeChannelMap,
		SpeechInvokeChannelMap,
		SttInvokeChannelMap {}

export interface SendChannelMap extends WindowSendChannelMap {}

export interface EventChannelMap
	extends AgentEventChannelMap,
		WindowEventChannelMap,
		ChannelsEventChannelMap,
		SttEventChannelMap {}
