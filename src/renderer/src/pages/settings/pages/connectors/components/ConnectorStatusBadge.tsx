import React from 'react';
import { Badge } from '@/components/ui/badge';

type ConnectorStatus = Awaited<ReturnType<typeof window.connectors.list>>[number]['status'];

export function ConnectorStatusBadge({
	status,
}: {
	readonly status: ConnectorStatus;
}): React.JSX.Element {
	const variant = status === 'configured' ? 'default' : status === 'error' ? 'destructive' : 'outline';
	const label =
		status === 'configured'
			? 'Connected'
			: status === 'missing_auth'
				? 'Needs OAuth'
				: status === 'disabled'
					? 'Disabled'
					: 'Error';

	return (
		<Badge variant={variant} className="h-4 px-1.5 text-[10px]">
			{label}
		</Badge>
	);
}
