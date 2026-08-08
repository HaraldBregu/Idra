import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ExtensionTitleBar } from './components/app/titlebar/ExtensionTitleBar';
import { useAppTheme } from './components/app/titlebar/hooks/useAppTheme';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Impossible to find the extension root element');

let title = 'Extension';
try {
	title = decodeURIComponent(window.location.hash.replace(/^#\/?extension\//, '')) || title;
} catch {}

function ExtensionShell(): React.JSX.Element {
	useAppTheme();
	return <ExtensionTitleBar title={title} />;
}

createRoot(rootElement).render(
	<StrictMode>
		<ExtensionShell />
	</StrictMode>
);
