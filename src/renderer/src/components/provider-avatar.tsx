import React from 'react';
import { cn } from '@/lib/utils';

function getProviderInitial(name: string): string {
	const words = name.trim().split(/\s+/).filter(Boolean);
	const initials = words
		.slice(0, 2)
		.map((word) => word[0]?.toUpperCase() ?? '')
		.join('');

	return initials || name.slice(0, 1).toUpperCase();
}

export function ProviderAvatar({
	providerId,
	name,
	className,
}: {
	readonly providerId: string;
	readonly name: string;
	readonly className?: string;
}): React.JSX.Element {
	return (
		<div
			className={cn(
				'flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-semibold text-muted-foreground',
				className
			)}
		>
			{getProviderInitial(name || providerId)}
		</div>
	);
}
