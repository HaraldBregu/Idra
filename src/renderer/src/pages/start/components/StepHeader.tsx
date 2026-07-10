import React from 'react';
import type { LucideIcon } from 'lucide-react';

type StepHeaderProps = {
	readonly icon: LucideIcon;
	readonly title: string;
	readonly description: string;
};

export function StepHeader({ icon: Icon, title, description }: StepHeaderProps): React.JSX.Element {
	return (
		<div>
			<div className="mb-6 flex size-11 items-center justify-center rounded-xl bg-card text-foreground ring-1 ring-foreground/10">
				<Icon className="size-5" strokeWidth={1.6} aria-hidden="true" />
			</div>

			<h1 className="text-2xl font-bold leading-tight tracking-normal text-foreground">{title}</h1>
			<p className="mt-2 max-w-md text-xs font-medium leading-relaxed text-muted-foreground">
				{description}
			</p>
		</div>
	);
}
