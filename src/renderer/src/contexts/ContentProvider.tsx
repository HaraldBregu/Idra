import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
	type ReactElement,
	type ReactNode,
} from 'react';
import type { ResourceInfo } from '../../../shared/types';

export interface ContentContextValue {
	contents: ResourceInfo[];
	isLoading: boolean;
	refresh: () => Promise<void>;
	removeContent: (id: string) => void;
}

const ContentContext = createContext<ContentContextValue | undefined>(undefined);

interface ContentProviderProps {
	readonly children: ReactNode;
}

export function ContentProvider({ children }: ContentProviderProps): ReactElement {
	const [contents, setContents] = useState<ResourceInfo[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const mountedRef = useRef(true);

	const refresh = useCallback(async () => {
		if (!mountedRef.current) return;
		setIsLoading(true);
		try {
			const items = await window.app.workspace.getResources();
			if (!mountedRef.current) return;
			setContents(items.filter((r) => r.name.toLowerCase().endsWith('.md')));
		} catch (err) {
			console.error('[ContentProvider] getResources failed:', err);
			if (!mountedRef.current) return;
			setContents([]);
		} finally {
			if (mountedRef.current) setIsLoading(false);
		}
	}, []);

	const removeContent = useCallback((id: string) => {
		setContents((prev) => prev.filter((entry) => entry.id !== id));
	}, []);

	useEffect(() => {
		mountedRef.current = true;
		void refresh();
		const unsubscribeWorkspace = window.app.workspace.onChange((event) => {
			if (event.currentPath) {
				void refresh();
				return;
			}
			setContents([]);
		});
		return () => {
			mountedRef.current = false;
			unsubscribeWorkspace();
		};
	}, [refresh]);

	return (
		<ContentContext.Provider value={{ contents, isLoading, refresh, removeContent }}>
			{children}
		</ContentContext.Provider>
	);
}

export function useContentContext(): ContentContextValue {
	const ctx = useContext(ContentContext);
	if (!ctx) throw new Error('useContentContext must be used within ContentProvider');
	return ctx;
}
