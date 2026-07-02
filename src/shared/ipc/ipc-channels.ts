export { AgentChannels } from './channels/agent';
export { AppChannels } from './channels/app';
export { ChannelsChannels } from './channels/channels';
export { ProviderStoreChannels } from './channels/provider';
export { SpeechChannels } from './channels/speech';
export { SttChannels } from './channels/stt';
export { WindowChannels } from './channels/window';

import type { AgentEventChannelMap, AgentInvokeChannelMap } from './channels/agent';
import type { AppInvokeChannelMap } from './channels/app';
import type {
	ChannelsEventChannelMap,
	ChannelsInvokeChannelMap,
} from './channels/channels';
import type { ProviderStoreInvokeChannelMap } from './channels/provider';
import type { SttEventChannelMap, SttInvokeChannelMap } from './channels/stt';
import type {
	WindowEventChannelMap,
	WindowInvokeChannelMap,
	WindowSendChannelMap,
} from './channels/window';

export interface InvokeChannelMap
	extends AppInvokeChannelMap,
		AgentInvokeChannelMap,
		ProviderStoreInvokeChannelMap,
		WindowInvokeChannelMap,
		ChannelsInvokeChannelMap,
		SttInvokeChannelMap {}

export interface SendChannelMap extends WindowSendChannelMap {}

export interface EventChannelMap
	extends AgentEventChannelMap,
		WindowEventChannelMap,
		ChannelsEventChannelMap,
		SttEventChannelMap {}
