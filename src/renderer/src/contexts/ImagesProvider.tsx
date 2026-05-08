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

const IMAGE_EXTENSIONS = new Set([
	'.jpg',
	'.jpeg',
	'.png',
	'.gif',
	'.webp',
	'.svg',
	'.avif',
	'.bmp',
]);

function isImage(entry: ResourceInfo): boolean {
	if (entry.mimeType.startsWith('image/')) return true;
	const dot = entry.name.lastIndexOf('.');
	if (dot === -1) return false;
	return IMAGE_EXTENSIONS.has(entry.name.slice(dot).toLowerCase());
}

export interface ImagesContextValue {
	images: ResourceInfo[];
	isLoading: boolean;
	refresh: () => Promise<void>;
	removeImage: (id: string) => void;
}

const ImagesContext = createContext<ImagesContextValue | undefined>(undefined);

interface ImagesProviderProps {
	readonly children: ReactNode;
}

export function ImagesProvider({ children }: ImagesProviderProps): ReactElement {
	const [images, setImages] = useState<ResourceInfo[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const mountedRef = useRef(true);

	const refresh = useCallback(async () => {
		if (!mountedRef.current) return;
		setIsLoading(true);
		try {
			const items = await window.app.workspace.getResources();
			if (!mountedRef.current) return;
			setImages(items.filter(isImage));
		} catch (err) {
			console.error('[ImagesProvider] getResources failed:', err);
			if (!mountedRef.current) return;
			setImages([]);
		} finally {
			if (mountedRef.current) setIsLoading(false);
		}
	}, []);

	const removeImage = useCallback((id: string) => {
		setImages((prev) => prev.filter((entry) => entry.id !== id));
	}, []);

	useEffect(() => {
		mountedRef.current = true;
		void refresh();
		const unsubscribeResources = window.app.workspace.onResourcesChanged(() => {
			void refresh();
		});
		const unsubscribeWorkspace = window.app.workspace.onChange((event) => {
			if (event.currentPath) {
				void refresh();
				return;
			}
			setImages([]);
		});
		return () => {
			mountedRef.current = false;
			unsubscribeResources();
			unsubscribeWorkspace();
		};
	}, [refresh]);

	return (
		<ImagesContext.Provider value={{ images, isLoading, refresh, removeImage }}>
			{children}
		</ImagesContext.Provider>
	);
}

export function useImagesContext(): ImagesContextValue {
	const ctx = useContext(ImagesContext);
	if (!ctx) throw new Error('useImagesContext must be used within ImagesProvider');
	return ctx;
}
