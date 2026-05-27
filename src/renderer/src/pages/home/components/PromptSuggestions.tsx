import { type ReactElement } from 'react';
import { PromptSuggestion } from '@/components/ui/prompt-suggestion';

const promptSuggestions = [
	{
		label: 'Introduce yourself',
		prompt:
			'Introduce yourself as Friday, my personal assistant. Keep it brief and specific: explain what you can help me do, how I should ask for help, and suggest three useful first tasks.',
	},
	{
		label: 'Say hi',
		prompt:
			'Say hi and start a short onboarding conversation. Ask what I am working on today, then offer a few practical ways you can help me right now.',
	},
	{
		label: 'Meet your assistant',
		prompt:
			'Give me a quick tour of Friday as my personal assistant. Summarize your main capabilities, explain the best way to work with you, and propose three starter prompts I can try.',
	},
	{
		label: 'Plan my day',
		prompt:
			'Help me plan today. Ask for my priorities, time constraints, and any deadlines, then turn them into a practical schedule.',
	},
	{
		label: 'Draft a message',
		prompt:
			'Help me draft a clear message. Ask who it is for, what I need to say, and the tone I want.',
	},
	{
		label: 'Brainstorm ideas',
		prompt:
			'Brainstorm ten practical ideas for something I can improve this week, then help me choose one small next action.',
	},
] as const;

export function PromptSuggestions({
	onUseSuggestion,
}: {
	readonly onUseSuggestion: (prompt: string) => void;
}): ReactElement {
	return (
		<div className="mb-2 flex flex-wrap justify-center gap-2 px-1" aria-label="Prompt suggestions">
			{promptSuggestions.map((suggestion) => (
				<PromptSuggestion
					key={suggestion.label}
					type="button"
					variant="outline"
					size="sm"
					className="h-8 max-w-full border-border/70 bg-card/95 px-3 text-xs font-medium text-muted-foreground shadow-sm shadow-foreground/5 hover:text-foreground"
					aria-label={suggestion.prompt}
					onClick={() => onUseSuggestion(suggestion.prompt)}
				>
					{suggestion.label}
				</PromptSuggestion>
			))}
		</div>
	);
}
