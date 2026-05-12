import React from 'react';
import { Badge } from '@/components/ui/Badge';
import type { ConnectorStatus } from '../../../../../shared/connectors';

export function ConnectorStatusBadge({
	status,
}: {
	readonly status: ConnectorStatus;
}): React.JSX.Element {
	const variant = status === 'connected' ? 'default' : status === 'error' ? 'destructive' : 'outline';
	const label =
		status === 'connected'
			? 'Connected'
			: status === 'disconnected'
				? 'Disconnected'
				: status === 'error'
					? 'Error'
					: 'Unknown';

	return <Badge variant={variant}>{label}</Badge>;
}
