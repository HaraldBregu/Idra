import { Tldraw } from 'tldraw';
import { assetUrls, components, licenseKey, shapeUtils } from './config';
import { overrides } from './actions';
import { mount } from './mount';

export default function Canvas() {
	return (
		<Tldraw
			assetUrls={assetUrls}
			autoFocus
			components={components}
			licenseKey={licenseKey}
			onMount={mount}
			overrides={overrides}
			persistenceKey="friday-tldraw"
			shapeUtils={shapeUtils}
		/>
	);
}
