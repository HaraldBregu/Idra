export { AgentChannels } from './channels/agent';
export { AppChannels } from './channels/app';
export { ChannelsChannels } from './channels/channels';
export { ConnectorsChannels } from './channels/connectors';
export { CronChannels } from './channels/cron';
export { HeartbeatChannels } from './channels/heartbeat';
export { ProviderStoreChannels } from './channels/provider';
export { SkillsChannels } from './channels/skills';
export { SttChannels } from './channels/stt';
export { WindowChannels } from './channels/window';

import type { AgentEventChannelMap, AgentInvokeChannelMap } from './channels/agent';
import type { AppInvokeChannelMap } from './channels/app';
import type {
	ChannelsEventChannelMap,
	ChannelsInvokeChannelMap,
} from './channels/channels';
import type { ConnectorsInvokeChannelMap } from './channels/connectors';
import type { McpInvokeChannelMap } from './channels/mcp';
import type { CronEventChannelMap, CronInvokeChannelMap } from './channels/cron';
import type { HeartbeatEventChannelMap, HeartbeatInvokeChannelMap } from './channels/heartbeat';
import type { ProviderStoreInvokeChannelMap } from './channels/provider';
import type { SkillsInvokeChannelMap } from './channels/skills';
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
		CronInvokeChannelMap,
		HeartbeatInvokeChannelMap,
		SkillsInvokeChannelMap,
		ChannelsInvokeChannelMap,
		ConnectorsInvokeChannelMap,
		McpInvokeChannelMap,
		SttInvokeChannelMap {}

export interface SendChannelMap extends WindowSendChannelMap {}

export interface EventChannelMap
	extends AgentEventChannelMap,
		WindowEventChannelMap,
		ChannelsEventChannelMap,
		CronEventChannelMap,
		HeartbeatEventChannelMap,
		SttEventChannelMap {}
