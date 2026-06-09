export { AgentChannels } from './channels/agent';
export { AgentStoreChannels } from './channels/agent-store';
export { AppChannels } from './channels/app';
export { ChannelsChannels } from './channels/channels';
export { ConnectorsChannels } from './channels/connectors';
export { CronChannels } from './channels/cron';
export { HeartbeatChannels } from './channels/heartbeat';
export { ProviderStoreChannels } from './channels/provider';
export { RealtimeTranscriptionChannels } from './channels/realtime-transcription';
export { SkillsChannels } from './channels/skills';
export { WindowChannels } from './channels/window';

import type { AgentEventChannelMap, AgentInvokeChannelMap } from './channels/agent';
import type { AgentStoreInvokeChannelMap } from './channels/agent-store';
import type { AppInvokeChannelMap } from './channels/app';
import type {
	ChannelsEventChannelMap,
	ChannelsInvokeChannelMap,
} from './channels/channels';
import type { ConnectorsInvokeChannelMap } from './channels/connectors';
import type { CronEventChannelMap, CronInvokeChannelMap } from './channels/cron';
import type { HeartbeatEventChannelMap, HeartbeatInvokeChannelMap } from './channels/heartbeat';
import type { ProviderStoreInvokeChannelMap } from './channels/provider';
import type {
	RealtimeTranscriptionEventChannelMap,
	RealtimeTranscriptionInvokeChannelMap,
	RealtimeTranscriptionSendChannelMap,
} from './channels/realtime-transcription';
import type { SkillsInvokeChannelMap } from './channels/skills';
import type {
	WindowEventChannelMap,
	WindowInvokeChannelMap,
	WindowSendChannelMap,
} from './channels/window';

export interface InvokeChannelMap
	extends AppInvokeChannelMap,
		AgentInvokeChannelMap,
		AgentStoreInvokeChannelMap,
		ProviderStoreInvokeChannelMap,
		WindowInvokeChannelMap,
		CronInvokeChannelMap,
		HeartbeatInvokeChannelMap,
		SkillsInvokeChannelMap,
		ChannelsInvokeChannelMap,
		ConnectorsInvokeChannelMap,
		RealtimeTranscriptionInvokeChannelMap {}

export interface SendChannelMap
	extends WindowSendChannelMap,
		RealtimeTranscriptionSendChannelMap {}

export interface EventChannelMap
	extends AgentEventChannelMap,
		WindowEventChannelMap,
		ChannelsEventChannelMap,
		CronEventChannelMap,
		HeartbeatEventChannelMap,
		RealtimeTranscriptionEventChannelMap {}
