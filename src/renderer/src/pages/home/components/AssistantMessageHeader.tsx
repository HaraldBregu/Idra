import type { ReactElement } from 'react';
import { GradientSphere, type GradientSphereState } from '@/components/ui/gradient-sphere';
import { cn } from '@/lib/utils';

export function AssistantMessageHeader({
	avatarState = 'stopped',
	className,
}: {
	readonly avatarState?: GradientSphereState;
	readonly className?: string;
}): ReactElement {
	return (
		<div className={cn('flex min-w-0 items-center gap-2', className)}>
			<GradientSphere size={24} state={avatarState} />
			<span className="min-w-0 truncate text-sm font-semibold leading-none text-foreground">
				Friday
			</span>
		</div>
	);
}
