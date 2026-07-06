import { type ReactElement } from 'react';
import {
	PromptInput,
	usePromptInput,
	type PromptInputProps,
} from '@/components/ui/prompt-input';
import { cn } from '@/lib/utils';
import { SlashMenu } from './slash-menu';
import { TextEditor } from './text-editor';

export type PromptEditorProps = Omit<PromptInputProps, 'children'> & {
	readonly placeholder?: string;
	readonly ariaLabel?: string;
};

function PromptEditorArea({
	placeholder,
	ariaLabel,
}: {
	readonly placeholder?: string;
	readonly ariaLabel?: string;
}): ReactElement {
	const { value, setValue, onSubmit, disabled, textareaRef, isExpanded, adaptiveLayout } =
		usePromptInput();

	return (
		<TextEditor
			value={value}
			onValueChange={setValue}
			onSubmit={onSubmit}
			disabled={disabled}
			placeholder={placeholder}
			ariaLabel={ariaLabel}
			extensions={[SlashMenu]}
			onEditorReady={(editor) => {
				// ponytail: PromptInput only uses this ref for focus() and scrollHeight,
				// both of which the contenteditable element supports
				textareaRef.current = editor.view.dom as unknown as HTMLTextAreaElement;
			}}
			className={cn(
				'text-sm leading-6 text-foreground',
				adaptiveLayout && 'max-h-[34vh] overflow-y-auto',
				adaptiveLayout && (isExpanded ? 'min-h-14' : 'min-h-7')
			)}
		/>
	);
}

function PromptEditor({
	placeholder,
	ariaLabel,
	expandedThreshold = 40,
	...props
}: PromptEditorProps): ReactElement {
	return (
		<PromptInput expandedThreshold={expandedThreshold} {...props}>
			<PromptEditorArea placeholder={placeholder} ariaLabel={ariaLabel} />
		</PromptInput>
	);
}

export { PromptEditor };
