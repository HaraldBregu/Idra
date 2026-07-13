import React from 'react';
import { LogoView } from '@/components/app/base/logo-view';
import { STEP_COPY } from '../constants';

export function PresentationStep(): React.JSX.Element {
	const { title, description } = STEP_COPY.presentation;

	return (
		<div className="mx-auto flex min-h-full w-full max-w-5xl flex-col items-center justify-center px-4 py-6 text-center sm:px-6">
			<div className="flex w-full flex-wrap items-start justify-center gap-8">
				<LogoView />
			</div>
			<h1 className="mt-6 text-3xl font-bold leading-tight tracking-tight text-foreground">
				{title}
			</h1>
			<p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
		</div>
	);
}
