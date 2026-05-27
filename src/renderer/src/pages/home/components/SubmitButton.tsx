import { type ReactElement } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUp, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PromptInputAction } from '@/components/ui/prompt-input';

export function SubmitButton({
	isLoading,
	canSubmit,
	disabled,
	onAction,
}: {
	readonly isLoading: boolean;
	readonly canSubmit: boolean;
	readonly disabled?: boolean;
	readonly onAction: () => void;
}): ReactElement | null {
	if (!isLoading && !canSubmit) return null;

	const label = isLoading ? 'Stop generation' : 'Send message';
	const iconKey = isLoading ? 'stop' : 'send';
	const icon = isLoading ? (
		<Square className="size-4 fill-current" />
	) : (
		<ArrowUp className="size-4" />
	);

	return (
		<PromptInputAction tooltip={label}>
			<Button
				type="button"
				variant="default"
				size="icon"
				className="size-9 overflow-hidden rounded-full bg-foreground text-background hover:bg-foreground/90"
				aria-label={label}
				disabled={disabled}
				onClick={onAction}
			>
				<AnimatePresence mode="wait" initial={false}>
					<motion.span
						key={iconKey}
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -8 }}
						transition={{ duration: 0.14, ease: [0.4, 0, 0.2, 1] }}
						className="flex items-center justify-center"
					>
						{icon}
					</motion.span>
				</AnimatePresence>
			</Button>
		</PromptInputAction>
	);
}
