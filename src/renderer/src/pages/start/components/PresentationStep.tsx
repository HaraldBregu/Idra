import React from 'react';
import { DomeWaveAnimation } from '@/components/ui/dome-wave-animation';
import { Item, ItemIcon, ItemTitle } from '@/components/ui/item';
import { MODEL_SERVICE_DEFINITIONS, STEP_COPY } from '../constants';

export function PresentationStep(): React.JSX.Element {
	const { title, description } = STEP_COPY.presentation;

	return (
		<div className="mx-auto flex min-h-full w-full max-w-2xl flex-col items-center justify-center px-4 py-10 text-center sm:px-6">
			<DomeWaveAnimation height={120} className="w-full max-w-sm" />
			<h1 className="mt-8 text-3xl font-bold leading-tight tracking-tight text-foreground">
				{title}
			</h1>
			<p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
				{description}
			</p>

			<div className="mt-8 grid w-full max-w-md grid-cols-2 gap-2">
				{MODEL_SERVICE_DEFINITIONS.map((service) => (
					<Item
						key={service.id}
						className="rounded-lg bg-card ring-1 ring-foreground/10"
					>
						<ItemIcon icon={service.icon} />
						<ItemTitle>{service.label}</ItemTitle>
					</Item>
				))}
			</div>
		</div>
	);
}
