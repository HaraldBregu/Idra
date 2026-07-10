import React from 'react';
import { Bot, Image as ImageIcon, Mic, Volume2 } from 'lucide-react';
import { DomeWaveAnimation } from '@/components/ui/dome-wave-animation';
import { Item, ItemIcon, ItemTitle } from '@/components/ui/item';
import { STEP_COPY } from '../constants';

const CAPABILITIES = [
	{ icon: Bot, label: 'AI Assistant' },
	{ icon: Mic, label: 'Transcribe' },
	{ icon: Volume2, label: 'Voice' },
	{ icon: ImageIcon, label: 'Image' },
] as const;

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
				{CAPABILITIES.map((capability) => (
					<Item
						key={capability.label}
						className="rounded-lg bg-card ring-1 ring-foreground/10"
					>
						<ItemIcon icon={capability.icon} />
						<ItemTitle>{capability.label}</ItemTitle>
					</Item>
				))}
			</div>

			<p className="mt-4 text-xs text-muted-foreground">
				Transcribe, voice, and image can be set up anytime in Settings.
			</p>
		</div>
	);
}
