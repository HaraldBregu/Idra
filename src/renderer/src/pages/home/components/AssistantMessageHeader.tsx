import type { ReactElement } from 'react';
import { GradientSphere } from '@/components/ui/gradient-sphere';
import { cn } from '@/lib/utils';

export function AssistantMessageHeader({
	className,
}: {
	readonly className?: string;
}): ReactElement {
	return (
		<div className={cn('flex min-w-0 items-center gap-2', className)}>
			<GradientSphere size={24} mode="css" />
			<span className="min-w-0 truncate text-sm font-semibold leading-none text-foreground">
				Friday
			</span>
		</div>
	);
}
