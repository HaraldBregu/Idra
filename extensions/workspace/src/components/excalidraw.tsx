import { Excalidraw, serializeAsJSON } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import { useEffect, useRef, useState } from 'react';
import type { ExcalidrawInitialDataState } from '@excalidraw/excalidraw/types';

import { EMPTY_EXCALIDRAW_CONTENT } from '@/lib/content';

interface ExcalidrawEditorProps {
	content: string;
	isDark: boolean;
	onChange: (content: string) => void;
	onSave: () => Promise<boolean>;
	path: string;
}

export function ExcalidrawEditor({
	content,
	isDark,
	onChange,
	onSave,
	path,
}: ExcalidrawEditorProps) {
	const [initialScene] = useState<{
		content: string;
		data: ExcalidrawInitialDataState | null;
		error: string;
	}>(() => {
		const initialContent = content.trim() ? content : EMPTY_EXCALIDRAW_CONTENT;
		try {
			const parsed: unknown = JSON.parse(initialContent);
			if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
				throw new Error('The file does not contain an Excalidraw document.');
			}
			return { content: initialContent, data: parsed as ExcalidrawInitialDataState, error: '' };
		} catch (parseError) {
			return {
				content: initialContent,
				data: null,
				error:
					parseError instanceof Error
						? parseError.message
						: 'Unable to read the Excalidraw document.',
			};
		}
	});
	const lastSerializedRef = useRef(initialScene.content);

	useEffect(() => {
		const save = (event: KeyboardEvent) => {
			if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 's') return;
			event.preventDefault();
			void onSave();
		};
		window.addEventListener('keydown', save, true);
		return () => window.removeEventListener('keydown', save, true);
	}, [onSave]);

	if (!initialScene.data) {
		return (
			<div className="flex min-h-full items-center justify-center px-6 text-center">
				<p className="max-w-xl text-sm text-destructive">{initialScene.error}</p>
			</div>
		);
	}

	return (
		<div className="h-full min-h-[calc(100dvh-3.5rem)] w-full overflow-hidden">
			<Excalidraw
				autoFocus
				initialData={initialScene.data}
				name={path.split(/[\\/]/).pop() ?? path}
				onChange={(elements, appState, files) => {
					const serialized = serializeAsJSON(elements, appState, files, 'local');
					if (serialized === lastSerializedRef.current) return;
					lastSerializedRef.current = serialized;
					onChange(serialized);
				}}
				theme={isDark ? 'dark' : 'light'}
				UIOptions={{
					canvasActions: {
						loadScene: false,
						saveToActiveFile: false,
						toggleTheme: false,
					},
				}}
			/>
		</div>
	);
}
