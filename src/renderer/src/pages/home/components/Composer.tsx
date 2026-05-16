import type { ReactElement } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUp, AudioLines, Mic, Plus, RotateCcw, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	PromptInput,
	PromptInputAction,
	PromptInputActions,
	PromptInputTextarea,
} from '@/components/ui/prompt-input';
import type { ComposerProps } from './types';

function AttachmentButton(): ReactElement {
	return (
		<PromptInputAction tooltip="Add attachment">
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="size-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
				aria-label="Add attachment"
			>
				<Plus className="size-4" />
			</Button>
		</PromptInputAction>
	);
}

function ResetButton({ onReset }: { readonly onReset: () => void }): ReactElement {
	return (
		<PromptInputAction tooltip="Reset conversation">
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="size-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
				aria-label="Reset conversation"
				onClick={onReset}
			>
				<RotateCcw className="size-4" />
			</Button>
		</PromptInputAction>
	);
}

function VoiceButton({
	onVoiceModeRequest,
}: {
	readonly onVoiceModeRequest: () => void;
}): ReactElement {
	return (
		<PromptInputAction tooltip="Voice assistant">
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="size-8 rounded-lg text-foreground hover:bg-muted"
				aria-label="Switch to voice"
				onClick={onVoiceModeRequest}
			>
				<Mic className="size-4" />
			</Button>
		</PromptInputAction>
	);
}

function SubmitButton({
	isLoading,
	canSubmit,
	onAction,
}: {
	readonly isLoading: boolean;
	readonly canSubmit: boolean;
	readonly onAction: () => void;
}): ReactElement {
	const label = isLoading ? 'Stop generation' : canSubmit ? 'Send message' : 'Start voice conversation';
	const iconKey = isLoading ? 'stop' : canSubmit ? 'send' : 'voice';
	const icon = isLoading ? (
		<Square className="size-4 fill-current" />
	) : canSubmit ? (
		<ArrowUp className="size-4" />
	) : (
		<AudioLines className="size-4" />
	);

	return (
		<PromptInputAction tooltip={label}>
			<Button
				type="button"
				variant="default"
				size="icon"
				className="size-9 overflow-hidden rounded-lg bg-foreground text-background hover:bg-foreground/90"
				aria-label={label}
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

export function Composer({
	value,
	isLoading,
	canReset,
	inputRef,
	onValueChange,
	onSubmit,
	onReset,
	onVoiceModeRequest,
}: ComposerProps): ReactElement {
	const canSubmit = value.trim().length > 0;
	const handlePrimaryAction = (): void => {
		if (isLoading || canSubmit) {
			onSubmit();
			return;
		}
		onVoiceModeRequest();
	};

	return (
		<div className="flex shrink-0 justify-center bg-gradient-to-t from-background via-background/95 to-transparent px-5 pb-4 pt-4">
			<PromptInput
				value={value}
				onValueChange={onValueChange}
				isLoading={isLoading}
				maxHeight={360}
				onSubmit={onSubmit}
				textareaRef={inputRef}
				leadingAction={<AttachmentButton />}
				className="w-full"
				actions={
					<PromptInputActions className="justify-end gap-1.5">
						<AnimatePresence initial={false}>
							{canReset && (
								<motion.div
									key="reset"
									initial={{ opacity: 0, scale: 0.7, x: -6 }}
									animate={{ opacity: 1, scale: 1, x: 0 }}
									exit={{ opacity: 0, scale: 0.7, x: -6 }}
									transition={{ type: 'spring', stiffness: 380, damping: 28, mass: 0.4 }}
									className="shrink-0"
								>
									<ResetButton onReset={onReset} />
								</motion.div>
							)}
						</AnimatePresence>
						<VoiceButton onVoiceModeRequest={onVoiceModeRequest} />
						<SubmitButton isLoading={isLoading} canSubmit={canSubmit} onAction={handlePrimaryAction} />
					</PromptInputActions>
				}
			>
				<PromptInputTextarea placeholder="Ask anything" aria-label="Message Friday" />
			</PromptInput>
		</div>
	);
}
