import React from 'react';
export type ConnectorStatus = 'configured' | 'disabled' | 'error';
export declare function ConnectorStatusBadge({ status, }: {
    readonly status: ConnectorStatus;
}): React.JSX.Element;
