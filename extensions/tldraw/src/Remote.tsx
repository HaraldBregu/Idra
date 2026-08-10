import { useSyncDemo } from '@tldraw/sync';
import { Tldraw } from 'tldraw';
import { assetUrls, components, licenseKey, shapeUtils } from './config';
import { overrides } from './actions';
import { mount } from './mount';

export default function Remote({ roomId }: { roomId: string }) {
	const store = useSyncDemo({ roomId, shapeUtils });

	return (
		<Tldraw
			assetUrls={assetUrls}
			autoFocus
			components={components}
			licenseKey={licenseKey}
			onMount={mount}
			overrides={overrides}
			shapeUtils={shapeUtils}
			store={store}
		/>
	);
}
