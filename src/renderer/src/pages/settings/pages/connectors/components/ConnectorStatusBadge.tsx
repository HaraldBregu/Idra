import React from 'react';
import { Badge } from '@/components/ui/badge';

export type ConnectorStatus = 'configured' | 'disabled' | 'error';

export function ConnectorStatusBadge({
	status,
}: {
	readonly status: ConnectorStatus;
}): React.JSX.Element {
	const variant = status === 'configured' ? 'default' : status === 'error' ? 'destructive' : 'outline';
	const label =
		status === 'configured'
			? 'Connected'
			: status === 'disabled'
				? 'Disabled'
				: 'Error';

	return (
		<Badge variant={variant} className="h-4 px-1.5 text-[10px]">
			{label}
		</Badge>
	);
}
