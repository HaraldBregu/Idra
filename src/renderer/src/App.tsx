import React, { useEffect, useState } from 'react';
import { RouterProvider } from '@tanstack/react-router';
import { AppProvider } from './contexts';
import { ErrorBoundary } from './components/app/base/ErrorBoundary';
import { LayoutLoadingSkeleton } from './components/app/base/LayoutLoadingSkeleton';
import type { AppStartupInfo } from '../../shared/types';
import { router } from './router';
import './index.css';

const FALLBACK_STARTUP_INFO: AppStartupInfo = {
	startupCount: 0,
	isFirstRun: false,
	isInitialized: true,
};

const App: React.FC = () => {
	const [startupInfo, setStartupInfo] = useState<AppStartupInfo | null>(null);

	useEffect(() => {
		let isMounted = true;

		const loadStartupInfo = async () => {
			if (typeof window.app?.getStartupInfo !== 'function') {
				if (isMounted) {
					setStartupInfo(FALLBACK_STARTUP_INFO);
				}
				return;
			}

			try {
				const info = await window.app.getStartupInfo();
				if (isMounted) {
					setStartupInfo(info);
				}
			} catch {
				if (isMounted) {
					setStartupInfo(FALLBACK_STARTUP_INFO);
				}
			}
		};

		void loadStartupInfo();

		return () => {
			isMounted = false;
		};
	}, []);

	useEffect(() => {
		if (!startupInfo) return;

		const preload = (): void => {
			void import('./pages/settings/pages/assistant/Page');
		};
		const win = window as unknown as {
			requestIdleCallback?: (cb: () => void) => number;
			cancelIdleCallback?: (handle: number) => void;
		};
		const preloadHandle = win.requestIdleCallback
			? win.requestIdleCallback(preload)
			: window.setTimeout(preload, 1500);

		return () => {
			if (win.requestIdleCallback && win.cancelIdleCallback) {
				win.cancelIdleCallback(preloadHandle);
			} else {
				window.clearTimeout(preloadHandle);
			}
		};
	}, [startupInfo]);

	if (!startupInfo) {
		return (
			<ErrorBoundary level="root">
				<AppProvider>
					<LayoutLoadingSkeleton />
				</AppProvider>
			</ErrorBoundary>
		);
	}

	return (
		<ErrorBoundary level="root">
			<AppProvider>
				<RouterProvider router={router} context={{ startupInfo, setStartupInfo }} />
			</AppProvider>
		</ErrorBoundary>
	);
};

export default App;
