import { getAssetUrlsByImport } from '@tldraw/assets/imports.vite';
import { EmbedShapeUtil, type TLComponents, type TLShapeUtilConstructor } from 'tldraw';
import Menu from './Menu';

const googleMapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export const assetUrls = getAssetUrlsByImport();
export const components: TLComponents = { MainMenu: Menu };
export const licenseKey = import.meta.env.VITE_TLDRAW_LICENSE_KEY || undefined;
export const shapeUtils: TLShapeUtilConstructor[] | undefined = googleMapsKey
	? [
			EmbedShapeUtil.configure({
				embedConfig: { google_maps: { apiKey: googleMapsKey } },
			}),
		]
	: undefined;
