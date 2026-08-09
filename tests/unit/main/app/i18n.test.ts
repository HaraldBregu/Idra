import path from 'node:path';
import { readFileSync } from 'node:fs';
import { app } from 'electron';
import { loadTranslations } from '../../../../src/main/i18n';

jest.mock('node:fs', () => ({ readFileSync: jest.fn() }));
jest.mock('@electron-toolkit/utils', () => ({ is: { dev: true } }));

it('loads development translations from the Electron app root', () => {
	jest.mocked(readFileSync).mockReturnValue('{"file":"File"}');

	expect(loadTranslations('en', 'menu')).toEqual({ file: 'File' });
	expect(readFileSync).toHaveBeenCalledWith(
		path.join(app.getAppPath(), 'resources/i18n/en/menu.json'),
		'utf-8'
	);
});
