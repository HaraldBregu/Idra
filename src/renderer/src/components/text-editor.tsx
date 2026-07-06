import { useEffect, useRef, type ReactElement } from 'react';
import { type AnyExtension } from '@tiptap/core';
import { Placeholder } from '@tiptap/extensions';
import { Markdown } from '@tiptap/markdown';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { cn } from '@/lib/utils';
import { slashMenuPluginKey } from './slash-menu';

export type TextEditorProps = {
	readonly value?: string;
	readonly onValueChange?: (value: string) => void;
	readonly onSubmit?: () => void;
	readonly placeholder?: string;
	readonly disabled?: boolean;
	readonly extensions?: readonly AnyExtension[];
	readonly className?: string;
	readonly ariaLabel?: string;
	readonly onEditorReady?: (editor: Editor) => void;
};

function TextEditor({
	value,
	onValueChange,
	onSubmit,
	placeholder,
	disabled = false,
	extensions,
	className,
	ariaLabel,
	onEditorReady,
}: TextEditorProps): ReactElement {
	const onValueChangeRef = useRef(onValueChange);
	const onSubmitRef = useRef(onSubmit);
	onValueChangeRef.current = onValueChange;
	onSubmitRef.current = onSubmit;

	const editor = useEditor({
		extensions: [
			StarterKit,
			Placeholder.configure({ placeholder }),
			Markdown,
			...(extensions ?? []),
		],
		content: value ?? '',
		contentType: 'markdown',
		editable: !disabled,
		onCreate: ({ editor: createdEditor }) => onEditorReady?.(createdEditor),
		onUpdate: ({ editor: updatedEditor }) =>
			onValueChangeRef.current?.(updatedEditor.getMarkdown()),
		editorProps: {
			attributes: {
				role: 'textbox',
				'aria-multiline': 'true',
				...(ariaLabel ? { 'aria-label': ariaLabel } : {}),
				class: 'outline-none',
			},
			handleKeyDown: (view, event) => {
				if (
					event.key !== 'Enter' ||
					event.shiftKey ||
					event.altKey ||
					event.metaKey ||
					event.ctrlKey
				)
					return false;
				if (slashMenuPluginKey.getState(view.state)?.active) return false;
				onSubmitRef.current?.();
				return true;
			},
		},
	});

	useEffect(() => {
		if (!editor || editorText(editor) === (value ?? '')) return;
		const chain = editor.chain().setContent(textToDoc(value ?? ''), { emitUpdate: false });
		if (editor.isFocused) chain.focus('end');
		chain.run();
	}, [editor, value]);

	useEffect(() => {
		editor?.setEditable(!disabled);
	}, [editor, disabled]);

	return <EditorContent editor={editor} className={cn('w-full', className)} />;
}

export { TextEditor };
