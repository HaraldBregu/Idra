export { WindowChannels } from './channels/window';
export { AgentChannels } from './channels/agent';
export { ProviderStoreChannels } from './channels/provider-store';
export { AgentStoreChannels } from './channels/agent-store';
export { RealtimeTranscriptionChannels } from './channels/realtime-transcription';
export { SpeechToTextChannels } from './channels/speech-to-text';
export { AppChannels } from './channels/app';
export { CronChannels } from './channels/cron';
export { HeartbeatChannels } from './channels/heartbeat';
export { SkillsChannels } from './channels/skills';
export { ConnectorsChannels } from './channels/connectors';
export { ChannelsChannels } from './channels/channels';

import type { WindowInvokeChannelMap, WindowSendChannelMap, WindowEventChannelMap } from './channels/window';
import type { AgentInvokeChannelMap, AgentEventChannelMap } from './channels/agent';
import type { ProviderStoreInvokeChannelMap } from './channels/provider-store';
import type { AgentStoreInvokeChannelMap } from './channels/agent-store';
import type {
	RealtimeTranscriptionInvokeChannelMap,
	RealtimeTranscriptionSendChannelMap,
	RealtimeTranscriptionEventChannelMap,
} from './channels/realtime-transcription';
import type {
	SpeechToTextInvokeChannelMap,
	SpeechToTextSendChannelMap,
	SpeechToTextEventChannelMap,
} from './channels/speech-to-text';
import type { AppInvokeChannelMap } from './channels/app';
import type { CronInvokeChannelMap, CronEventChannelMap } from './channels/cron';
import type { HeartbeatInvokeChannelMap, HeartbeatEventChannelMap } from './channels/heartbeat';
import type { SkillsInvokeChannelMap } from './channels/skills';
import type { ChannelsInvokeChannelMap, ChannelsEventChannelMap } from './channels/channels';

export interface InvokeChannelMap
	extends
		AppInvokeChannelMap,
		AgentInvokeChannelMap,
		SpeechToTextInvokeChannelMap,
		AgentStoreInvokeChannelMap,
		ProviderStoreInvokeChannelMap,
		WindowInvokeChannelMap,
		CronInvokeChannelMap,
		HeartbeatInvokeChannelMap,
		SkillsInvokeChannelMap,
		ChannelsInvokeChannelMap,
		RealtimeTranscriptionInvokeChannelMap {}

export interface SendChannelMap
	extends
		WindowSendChannelMap,
		RealtimeTranscriptionSendChannelMap,
		SpeechToTextSendChannelMap {}

export interface EventChannelMap
	extends
		RealtimeTranscriptionEventChannelMap,
		SpeechToTextEventChannelMap,
		AgentEventChannelMap,
		WindowEventChannelMap,
		ChannelsEventChannelMap,
		CronEventChannelMap,
		HeartbeatEventChannelMap {}
