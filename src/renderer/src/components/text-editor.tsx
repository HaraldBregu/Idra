import { useEffect, useRef, type ReactElement } from 'react';
import { Placeholder } from '@tiptap/extensions';
import { Markdown } from '@tiptap/markdown';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { cn } from '@/lib/utils';

export type TextEditorProps = {
	readonly value?: string;
	readonly onValueChange?: (value: string) => void;
	readonly onSubmit?: () => void;
	readonly placeholder?: string;
	readonly disabled?: boolean;
	readonly className?: string;
	readonly ariaLabel?: string;
	readonly onEditorReady?: (editor: Editor) => void;
	readonly onVisualLineChange?: (hasMultipleLines: boolean) => void;
};

function TextEditor({
	value,
	onValueChange,
	onSubmit,
	placeholder,
	disabled = false,
	className,
	ariaLabel,
	onEditorReady,
	onVisualLineChange,
}: TextEditorProps): ReactElement {
	const onValueChangeRef = useRef(onValueChange);
	const onSubmitRef = useRef(onSubmit);
	const onVisualLineChangeRef = useRef(onVisualLineChange);
	onValueChangeRef.current = onValueChange;
	onSubmitRef.current = onSubmit;
	onVisualLineChangeRef.current = onVisualLineChange;

	const reportVisualLineChange = (updatedEditor: Editor): void => {
		const range = updatedEditor.view.dom.ownerDocument.createRange();
		range.selectNodeContents(updatedEditor.view.dom);
		const lineTops = new Set(
			Array.from(range.getClientRects())
				.filter((rect) => rect.width > 0 && rect.height > 0)
				.map((rect) => Math.round(rect.top))
		);
		onVisualLineChangeRef.current?.(lineTops.size > 1);
	};

	const editor = useEditor({
		extensions: [StarterKit, Placeholder.configure({ placeholder }), Markdown],
		content: value ?? '',
		contentType: 'markdown',
		editable: !disabled,
		onCreate: ({ editor: createdEditor }) => {
			onEditorReady?.(createdEditor);
			reportVisualLineChange(createdEditor);
		},
		onUpdate: ({ editor: updatedEditor }) => {
			onValueChangeRef.current?.(updatedEditor.getMarkdown());
			reportVisualLineChange(updatedEditor);
		},
		editorProps: {
			attributes: {
				role: 'textbox',
				'aria-multiline': 'true',
				...(ariaLabel ? { 'aria-label': ariaLabel } : {}),
				class: 'outline-none',
			},
			handleDrop: (view, event) => {
				const files = Array.from(event.dataTransfer?.files ?? []);
				if (files.length === 0) return false;
				const paths = files
					.map((file) => window.app.getPathForFile(file))
					.filter((path) => path.length > 0);
				if (paths.length > 0) {
					const pos =
						view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ??
						view.state.selection.to;
					view.dispatch(view.state.tr.insertText(paths.join(' '), pos));
				}
				return true;
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
				// Inside lists and code blocks Enter keeps its editing role
				// (next item / newline); an empty trailing item exits the block first.
				const { $from } = view.state.selection;
				for (let depth = $from.depth; depth > 0; depth--) {
					const nodeName = $from.node(depth).type.name;
					if (nodeName === 'listItem' || nodeName === 'codeBlock') return false;
				}
				onSubmitRef.current?.();
				return true;
			},
		},
	});

	useEffect(() => {
		if (!editor || editor.getMarkdown() === (value ?? '')) return;
		const chain = editor
			.chain()
			.setContent(value ?? '', { emitUpdate: false, contentType: 'markdown' });
		if (editor.isFocused) chain.focus('end');
		chain.run();
	}, [editor, value]);

	useEffect(() => {
		editor?.setEditable(!disabled);
	}, [editor, disabled]);

	return <EditorContent editor={editor} className={cn('w-full', className)} />;
}

export { TextEditor };
