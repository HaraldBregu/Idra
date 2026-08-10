import { app, isFriday } from '@friday/sdk';
import { AssetRecordType, getHashForString, type Editor, type TLBookmarkAsset } from 'tldraw';

export function mount(editor: Editor): void {
	if (!isFriday()) return;
	editor.registerExternalAssetHandler('url', async ({ url }): Promise<TLBookmarkAsset> => {
		let metadata = { description: '', favicon: '', image: '', title: '' };
		try {
			metadata = await app.unfurlUrl(url);
		} catch {
			metadata.title = new URL(url).hostname;
		}
		return {
			id: AssetRecordType.createId(getHashForString(url)),
			typeName: 'asset',
			type: 'bookmark',
			props: { src: url, ...metadata },
			meta: {},
		};
	});
}
