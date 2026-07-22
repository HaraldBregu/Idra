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
	it('opens Notes and Project from the Widgets menu', () => {
		const widgets = [
			{ id: 'notes', name: 'Notes' },
			{ id: 'project', name: 'Project' },
		];
		const onOpenWidget = jest.fn();
		const buildFromTemplate = ElectronMenu.buildFromTemplate as jest.Mock;
		buildFromTemplate.mockImplementation((template: MenuEntry[]) => template);
		const menu = new Menu({
			onLanguageChange: jest.fn(),
			onNewWindow: jest.fn(),
			getWidgets: () => widgets,
			onOpenWidget,
		});

		menu.create();

		const template = buildFromTemplate.mock.calls[0][0] as MenuEntry[];
		const widgets = template.find((entry) => entry.label === 'Widgets');
		widgets?.submenu?.find((entry) => entry.label === 'Notes')?.click?.();
		widgets?.submenu?.find((entry) => entry.label === 'Project')?.click?.();

		expect(onOpenWidget).toHaveBeenNthCalledWith(1, widgets[0]);
		expect(onOpenWidget).toHaveBeenNthCalledWith(2, widgets[1]);
	});
});
