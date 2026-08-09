import { Excalidraw, serializeAsJSON } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import { useEffect, useRef } from 'react';
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
	const initialContentRef = useRef(content.trim() ? content : EMPTY_EXCALIDRAW_CONTENT);
	const lastSerializedRef = useRef(initialContentRef.current);
	const onSaveRef = useRef(onSave);
	onSaveRef.current = onSave;

	useEffect(() => {
		const save = (event: KeyboardEvent) => {
			if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 's') return;
			event.preventDefault();
			void onSaveRef.current();
		};
		window.addEventListener('keydown', save, true);
		return () => window.removeEventListener('keydown', save, true);
	}, []);

	let initialData: ExcalidrawInitialDataState;
	try {
		const parsed: unknown = JSON.parse(initialContentRef.current);
		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
			throw new Error('The file does not contain an Excalidraw document.');
		}
		initialData = parsed as ExcalidrawInitialDataState;
	} catch (parseError) {
		return (
			<div className="flex min-h-full items-center justify-center px-6 text-center">
				<p className="max-w-xl text-sm text-destructive">
					{parseError instanceof Error
						? parseError.message
						: 'Unable to read the Excalidraw document.'}
				</p>
			</div>
		);
	}

	return (
		<div className="h-full min-h-[calc(100dvh-3.5rem)] w-full overflow-hidden">
			<Excalidraw
				autoFocus
				initialData={initialData}
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
