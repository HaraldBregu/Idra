import React from 'react';
import { KeyRound, MessageSquareText, SlidersHorizontal } from 'lucide-react';
import { LogoView } from '@/components/app/base/logo-view';
import { STEP_COPY } from '../constants';

export function PresentationStep(): React.JSX.Element {
	const { title, description } = STEP_COPY.presentation;

	return (
		<div className="mx-auto flex min-h-full w-full max-w-xl flex-col items-center justify-center px-4 py-8 text-center sm:px-6">
			<div className="flex size-24 items-center justify-center rounded-2xl border border-border/70 bg-background shadow-sm">
				<LogoView className="size-20 rounded-xl" />
			</div>
			<p className="mt-6 text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">
				Welcome to Friday
			</p>
			<h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-foreground">
				{title}
			</h1>
			<p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>

			<div className="mt-8 w-full border-t border-border/80 pt-5">
				<p className="text-xs font-semibold text-foreground">A quick setup, then you’re ready to work.</p>
				<ol className="mt-4 grid gap-3 sm:grid-cols-3">
					<li className="flex items-start gap-2.5 text-left">
						<KeyRound className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
						<span className="text-xs leading-5 text-muted-foreground">
							<span className="block font-medium text-foreground">Connect</span>
							Add a provider key.
						</span>
					</li>
					<li className="flex items-start gap-2.5 text-left">
						<SlidersHorizontal className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
						<span className="text-xs leading-5 text-muted-foreground">
							<span className="block font-medium text-foreground">Choose</span>
							Pick your assistant model.
						</span>
					</li>
					<li className="flex items-start gap-2.5 text-left">
						<MessageSquareText className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
						<span className="text-xs leading-5 text-muted-foreground">
							<span className="block font-medium text-foreground">Start</span>
							Take on your first task.
						</span>
					</li>
				</ol>
			</div>
		</div>
	);
}
