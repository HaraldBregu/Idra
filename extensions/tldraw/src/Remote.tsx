import { useSyncDemo } from '@tldraw/sync';
import { Tldraw } from 'tldraw';
import { assetUrls, components, licenseKey, shapeUtils } from './config';
import { overrides } from './actions';
import { mount } from './mount';

interface RemoteProps {
	colorScheme: 'light' | 'dark';
	roomId: string;
}

export default function Remote({ colorScheme, roomId }: RemoteProps) {
	const store = useSyncDemo({ roomId, shapeUtils });

	return (
		<Tldraw
			assetUrls={assetUrls}
			autoFocus
			colorScheme={colorScheme}
			components={components}
			licenseKey={licenseKey}
			onMount={(editor) => mount(editor, colorScheme)}
			overrides={overrides}
			shapeUtils={shapeUtils}
			store={store}
		/>
	);
}
