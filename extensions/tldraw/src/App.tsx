import { getAssetUrlsByImport } from '@tldraw/assets/imports.vite';
import { DefaultHelpMenu, Tldraw } from 'tldraw';
import Menu from './Menu';
import { overrides } from './actions';
import { useFriday } from './friday';

const assetUrls = getAssetUrlsByImport();
const components = { HelpMenu: DefaultHelpMenu, MainMenu: Menu };

export default function App() {
	const { colorScheme, locale } = useFriday();

	return (
		<main className="tldraw-extension">
			<Tldraw
				assetUrls={assetUrls}
				autoFocus
				colorScheme={colorScheme}
				components={components}
				locale={locale}
				options={{ deepLinks: true }}
				overrides={overrides}
				persistenceKey="friday-tldraw"
			/>
		</main>
	);
}
