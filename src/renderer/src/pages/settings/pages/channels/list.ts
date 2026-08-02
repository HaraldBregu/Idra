import { getChannelCatalogEntry, isChannelId } from '../../../../../../shared';
import type { Channel, ChannelType } from '../../../../../../shared';

export interface ChannelListEntry {
	readonly id: ChannelType;
	readonly label: string;
	readonly brandIconId?: string;
	readonly enabled: boolean;
}

/** The channels carried by the app IPC channel config. */
export function channelList(channels: Channel): ChannelListEntry[] {
	return Object.keys(channels)
		.filter(isChannelId)
		.map((id) => {
			const entry = getChannelCatalogEntry(id);
			return {
				id,
				label: entry?.label ?? id,
				brandIconId: entry?.brandIconId,
				enabled: Boolean(channels[id].enabled),
			};
		});
}
