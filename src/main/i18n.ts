import path from 'node:path';
import { readFileSync } from 'node:fs';
import { app } from 'electron';
import { is } from '@electron-toolkit/utils';

export type Translations = Record<string, string>;

export function loadTranslations(lng: string, component: string): Translations {
	const filePath = is.dev
		? path.join(app.getAppPath(), `resources/i18n/${lng}/${component}.json`)
		: path.join(process.resourcesPath, `resources/i18n/${lng}/${component}.json`);
	return JSON.parse(readFileSync(filePath, 'utf-8'));
}
