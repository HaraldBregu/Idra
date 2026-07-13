import React from 'react';
import { Code2, Sparkles, Workflow } from 'lucide-react';
import { LogoView } from '@/components/app/base/logo-view';
import { Item, ItemIcon, ItemTitle } from '@/components/ui/item';
import { STEP_COPY } from '../constants';

const FEATURES = [
	{
		icon: Sparkles,
		title: 'Personal Assistant',
		description: 'Chat, transcribe audio, voice & design tools.',
	},
	{
		icon: Code2,
		title: 'Developer Agent',
		description: 'Writes code, uses Skills and MCP tools.',
	},
	{
		icon: Workflow,
		title: 'Autonomous Work',
		description: 'Background Tasks, Goals, chat channels.',
	},
] as const;

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

			<div className="mt-8 flex flex-wrap items-stretch justify-center gap-2">
				{FEATURES.map((feature) => (
					<Item
						key={feature.title}
						className="w-auto max-w-60 rounded-lg bg-card ring-1 ring-foreground/10"
					>
						<ItemIcon icon={feature.icon} />
						<div className="min-w-0 text-left">
							<ItemTitle>{feature.title}</ItemTitle>
							<p className="text-[11px] leading-4 text-muted-foreground">{feature.description}</p>
						</div>
					</Item>
				))}
			</div>

			<p className="mt-4 text-xs text-muted-foreground">
				Transcribe, voice, and image can be set up anytime in Settings.
			</p>
		</div>
	);
}
