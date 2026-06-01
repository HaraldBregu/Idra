import type {
	Channel,
	ChannelHeartbeatVisibilityConfig,
	ChannelType,
} from '../../shared/channels';

export interface ResolvedHeartbeatVisibility {
	showOk: boolean;
	showAlerts: boolean;
	useIndicator: boolean;
}

const DEFAULT_VISIBILITY: ResolvedHeartbeatVisibility = {
	showOk: false,
	showAlerts: true,
	useIndicator: true,
};

export function resolveHeartbeatVisibility(input: {
	channel: Channel;
	channelId: ChannelType;
	accountId?: string;
}): ResolvedHeartbeatVisibility {
	const channelDefaults = input.channel.defaults?.heartbeat;
	const channelConfig = input.channel[input.channelId] as
		| {
				heartbeat?: ChannelHeartbeatVisibilityConfig;
				accounts?: Record<string, { heartbeat?: ChannelHeartbeatVisibilityConfig }>;
		  }
		| undefined;
	const perChannel = channelConfig?.heartbeat;
	const perAccount = input.accountId ? channelConfig?.accounts?.[input.accountId]?.heartbeat : undefined;
	return {
		showOk:
			perAccount?.showOk ??
			perChannel?.showOk ??
			channelDefaults?.showOk ??
			DEFAULT_VISIBILITY.showOk,
		showAlerts:
			perAccount?.showAlerts ??
			perChannel?.showAlerts ??
			channelDefaults?.showAlerts ??
			DEFAULT_VISIBILITY.showAlerts,
		useIndicator:
			perAccount?.useIndicator ??
			perChannel?.useIndicator ??
			channelDefaults?.useIndicator ??
			DEFAULT_VISIBILITY.useIndicator,
	};
}
