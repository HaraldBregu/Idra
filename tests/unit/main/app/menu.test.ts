import { Menu as ElectronMenu } from 'electron';
import { Menu } from '../../../../src/main/app/menu';

jest.mock('@electron-toolkit/utils', () => ({ is: { dev: true } }));
jest.mock('../../../../src/main/i18n', () => ({
	loadTranslations: () => ({
		extensions: 'Extensions',
	}),
}));

type MenuEntry = {
	label?: string;
	submenu?: MenuEntry[];
	click?: () => void;
};

describe('application menu extensions', () => {
	it('opens manifest-defined extensions from the Extensions menu', () => {
		const extensionConfigurations = [
			{
				id: 'weather',
				title: 'Weather',
				description: 'Local forecast',
				metadata: { version: '1.0.0', category: 'information', entry: 'index.html' },
			},
			{
				id: 'clock',
				title: 'World Clock',
				description: 'Times around the world',
				metadata: { version: '2.0.0', category: 'utility', entry: 'index.html' },
			},
		];
		const onOpenExtension = jest.fn();
		const buildFromTemplate = ElectronMenu.buildFromTemplate as jest.Mock;
		buildFromTemplate.mockImplementation((template: MenuEntry[]) => template);
		const menu = new Menu({
			onLanguageChange: jest.fn(),
			onNewWindow: jest.fn(),
			getExtensions: () => extensionConfigurations,
			onOpenExtension,
		});

		menu.create();

		const template = buildFromTemplate.mock.calls[0][0] as MenuEntry[];
		const extensionsMenu = template.find((entry) => entry.label === 'Extensions');
		extensionsMenu?.submenu?.find((entry) => entry.label === 'Weather')?.click?.();
		extensionsMenu?.submenu?.find((entry) => entry.label === 'World Clock')?.click?.();

		expect(onOpenExtension).toHaveBeenNthCalledWith(1, extensionConfigurations[0]);
		expect(onOpenExtension).toHaveBeenNthCalledWith(2, extensionConfigurations[1]);
	});

	it('rebuilds the Extensions submenu from the current extension list', () => {
		let extensions = [
			{
				id: 'weather',
				title: 'Weather',
				description: 'Local forecast',
				metadata: { version: '1.0.0', category: 'information', entry: 'index.html' },
			},
		];
		const buildFromTemplate = ElectronMenu.buildFromTemplate as jest.Mock;
		buildFromTemplate.mockClear();
		buildFromTemplate.mockImplementation((template: MenuEntry[]) => template);
		const menu = new Menu({
			onLanguageChange: jest.fn(),
			onNewWindow: jest.fn(),
			getExtensions: () => extensions,
			onOpenExtension: jest.fn(),
		});
		menu.create();
		extensions = [
			{
				id: 'clock',
				title: 'World Clock',
				description: 'Times around the world',
				metadata: { version: '2.0.0', category: 'utility', entry: 'index.html' },
			},
		];

		menu.create();

		const template = buildFromTemplate.mock.calls[1][0] as MenuEntry[];
		const extensionsMenu = template.find((entry) => entry.label === 'Extensions');
		expect(extensionsMenu?.submenu?.map((entry) => entry.label)).toEqual(['World Clock']);
	});
});
