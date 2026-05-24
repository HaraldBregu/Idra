import React from 'react';
import { Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DomeWaveAnimation } from '@/components/ui/dome-wave-animation';
import { STEP_COPY } from '../constants';

export function PresentationStep(): React.JSX.Element {
	const { title, description } = STEP_COPY.presentation;

	return (
		<div className="mx-auto flex min-h-full w-full max-w-2xl flex-col items-center justify-center px-4 py-10 text-center sm:px-6">
			<DomeWaveAnimation height={120} className="w-full max-w-sm" />
			<Badge variant="secondary" className="mt-5 h-6 rounded-md px-2.5 text-xs font-semibold">
				<Check className="size-3" />
				Model setup
			</Badge>
			<h1 className="mt-5 text-3xl font-bold leading-none tracking-normal text-foreground">
				{title}
			</h1>
			<p className="mt-4 max-w-md text-base font-medium leading-relaxed text-muted-foreground">
				{description}
			</p>
		</div>
	);
}
