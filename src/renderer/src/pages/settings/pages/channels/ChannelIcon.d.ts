import React from 'react';
import type { ChannelType } from '../../../../../../shared/channels';
export declare function ChannelIcon({ channelId, name, brandIconId, className, imageClassName, fallbackClassName, }: {
    readonly channelId: ChannelType | null | undefined;
    readonly name: string;
    readonly brandIconId?: string;
    readonly className?: string;
    readonly imageClassName?: string;
    readonly fallbackClassName?: string;
}): React.JSX.Element;
