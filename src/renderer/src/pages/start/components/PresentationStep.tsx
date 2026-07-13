import React from 'react';
import { Code2, Sparkles, Workflow } from 'lucide-react';
import { LogoView } from '@/components/app/base/logo-view';
import { ItemIcon } from '@/components/ui/item';
import { STEP_COPY } from '../constants';

const FEATURES = [
	{
		icon: Sparkles,
		title: 'Personal Assistant',
		description: 'Chat naturally, transcribe audio, and create with voice, design, and audio tools.',
	},
	{
		icon: Code2,
		title: 'Developer Agent',
		description: 'Writes real code and extends itself with Skills and remote tools via MCP servers.',
	},
	{
		icon: Workflow,
		title: 'Autonomous Work',
		description: 'Runs background Tasks, pursues Goals, and reaches you on your chat channels.',
	},
] as const;

export function PresentationStep(): React.JSX.Element {
	const { title, description } = STEP_COPY.presentation;

	return (
		<div className="mx-auto flex min-h-full w-full max-w-5xl flex-col items-center justify-center px-4 py-10 text-center sm:px-6">
			<div className="flex w-full flex-wrap items-start justify-center gap-8">
				<LogoView />
			</div>
			<h1 className="mt-6 text-3xl font-bold leading-tight tracking-tight text-foreground">
				{title}
			</h1>
			<p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>

			<div className="mt-8 grid w-full max-w-3xl gap-3 sm:grid-cols-3">
				{FEATURES.map((feature) => (
					<div
						key={feature.title}
						className="flex flex-col items-center gap-2 rounded-lg bg-card p-4 ring-1 ring-foreground/10"
					>
						<ItemIcon icon={feature.icon} />
						<h2 className="text-sm font-medium text-foreground">{feature.title}</h2>
						<p className="text-xs leading-relaxed text-muted-foreground">{feature.description}</p>
					</div>
				))}
			</div>

			<p className="mt-4 text-xs text-muted-foreground">
				Transcribe, voice, and image can be set up anytime in Settings.
			</p>
		</div>
	);
}
