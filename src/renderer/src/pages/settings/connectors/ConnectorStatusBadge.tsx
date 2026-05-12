import React from 'react';
import { Badge } from '@/components/ui/Badge';
import type { ConnectorStatus } from '../../../../../shared/connectors';

export function ConnectorStatusBadge({
	status,
}: {
	readonly status: ConnectorStatus;
}): React.JSX.Element {
	const variant = status === 'configured' ? 'default' : status === 'error' ? 'destructive' : 'outline';
	const label =
		status === 'configured'
			? 'Configured'
			: status === 'missing_auth'
				? 'Needs OAuth'
				: status === 'disabled'
					? 'Disabled'
					: 'Error';

	return <Badge variant={variant}>{label}</Badge>;
}
