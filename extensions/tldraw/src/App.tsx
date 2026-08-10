import { getAssetUrlsByImport } from '@tldraw/assets/imports.vite';
import { Tldraw } from 'tldraw';

const assetUrls = getAssetUrlsByImport();

export default function App() {
	return (
		<main className="tldraw-extension">
			<Tldraw
				assetUrls={assetUrls}
				autoFocus
				colorScheme="system"
				persistenceKey="friday-tldraw"
			/>
		</main>
	);
}
