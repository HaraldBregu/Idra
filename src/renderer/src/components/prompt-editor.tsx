import { type ReactElement } from 'react';
import {
	PromptInput,
	usePromptInput,
	type PromptInputProps,
} from '@/components/ui/prompt-input';
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
	const { value, setValue, onSubmit, disabled, textareaRef, isExpanded } = usePromptInput();

	return (
		<TextEditor
			value={value}
			onValueChange={setValue}
			onSubmit={onSubmit}
			disabled={disabled}
			placeholder={placeholder}
			ariaLabel={ariaLabel}
			onEditorReady={(editor) => {
				// ponytail: PromptInput uses this ref to focus the editor and locate its container
				textareaRef.current = editor.view.dom as unknown as HTMLTextAreaElement;
			}}
			className={`min-h-7 text-sm leading-6 text-foreground ${
				isExpanded
					? 'max-h-[34vh] overflow-y-auto'
					: 'h-7 overflow-hidden [&_.tiptap]:h-7 [&_.tiptap]:overflow-hidden'
			}`}
		/>
	);
}

function PromptEditor({
	placeholder,
	ariaLabel,
	expandedThreshold = 28,
	...props
}: PromptEditorProps): ReactElement {
	return (
		<PromptInput expandedThreshold={expandedThreshold} {...props}>
			<PromptEditorArea placeholder={placeholder} ariaLabel={ariaLabel} />
		</PromptInput>
	);
}

export { PromptEditor };
