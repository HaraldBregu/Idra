import React from 'react';
import type { ConnectorDefault } from '@shared/connector';
type ConnectorEntry = Awaited<ReturnType<typeof window.connectors.list>>[string];
type ConnectorIconAsset = {
    readonly light: string;
    readonly dark: string;
};
export declare function ConnectorCard({ catalogEntry, icon, connecting, connector, onConnect, onViewDetails, }: {
    readonly catalogEntry: ConnectorDefault;
    readonly icon?: ConnectorIconAsset;
    readonly connecting?: boolean;
    readonly connector?: {
        readonly id: string;
        readonly entry: ConnectorEntry;
    };
    readonly onConnect: () => void;
    readonly onViewDetails?: () => void;
}): React.JSX.Element;
export {};
