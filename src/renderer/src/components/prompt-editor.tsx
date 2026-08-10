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
	const { value, setValue, onSubmit, disabled, textareaRef } = usePromptInput();

	return (
		<TextEditor
			value={value}
			onValueChange={setValue}
			onSubmit={onSubmit}
			disabled={disabled}
			placeholder={placeholder}
			ariaLabel={ariaLabel}
			onEditorReady={(editor) => {
				// ponytail: PromptInput only uses this ref for focus() and scrollHeight,
				// both of which the contenteditable element supports
				textareaRef.current = editor.view.dom as unknown as HTMLTextAreaElement;
			}}
			className="max-h-[34vh] min-h-7 overflow-y-auto text-sm leading-6 text-foreground"
		/>
	);
}

function PromptEditor({ placeholder, ariaLabel, ...props }: PromptEditorProps): ReactElement {
	return (
		<PromptInput {...props}>
			<PromptEditorArea placeholder={placeholder} ariaLabel={ariaLabel} />
		</PromptInput>
	);
}

export { PromptEditor };
