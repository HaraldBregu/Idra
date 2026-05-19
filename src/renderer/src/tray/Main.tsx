import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TrayApp } from './TrayApp';
import './tray.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
	throw new Error('Impossible to find the root element');
}

createRoot(rootElement).render(
	<StrictMode>
		<TrayApp />
	</StrictMode>
);
