import { Menu as ElectronMenu } from 'electron';
import { Menu } from '../../../../src/main/app/menu';

jest.mock('@electron-toolkit/utils', () => ({ is: { dev: true } }));
jest.mock('../../../../src/main/app/i18n', () => ({
	loadTranslations: () => ({
		widgets: 'Widgets',
	}),
}));

type MenuEntry = {
	label?: string;
	submenu?: MenuEntry[];
	click?: () => void;
};

describe('application menu widgets', () => {
	it('opens manifest-defined widgets from the Widgets menu', () => {
		const widgetConfigurations = [
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
		const onOpenWidget = jest.fn();
		const buildFromTemplate = ElectronMenu.buildFromTemplate as jest.Mock;
		buildFromTemplate.mockImplementation((template: MenuEntry[]) => template);
		const menu = new Menu({
			onLanguageChange: jest.fn(),
			onNewWindow: jest.fn(),
			getWidgets: () => widgetConfigurations,
			onOpenWidget,
		});

		menu.create();

		const template = buildFromTemplate.mock.calls[0][0] as MenuEntry[];
		const widgetsMenu = template.find((entry) => entry.label === 'Widgets');
		widgetsMenu?.submenu?.find((entry) => entry.label === 'Weather')?.click?.();
		widgetsMenu?.submenu?.find((entry) => entry.label === 'World Clock')?.click?.();

		expect(onOpenWidget).toHaveBeenNthCalledWith(1, widgetConfigurations[0]);
		expect(onOpenWidget).toHaveBeenNthCalledWith(2, widgetConfigurations[1]);
	});
});
