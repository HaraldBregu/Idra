import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PermissionsPage from '../../../src/renderer/src/pages/settings/pages/permissions/Page';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({ t: (key: string) => key.split('.').at(-1) ?? key }),
}));

const permissions = {
	dir: { '/tmp': { recoursive: true, tools: ['read'] } },
	read: { default: 'allow' as const, allow: ['Desktop'], deny: [], ask: [] },
	write: { default: 'allow' as const, allow: [], deny: [], ask: [] },
	edit: {
		default: 'ask' as const,
		allow: ['Desktop/file.txt'],
		deny: [],
		ask: [],
	},
};

const agentApi = {
	policyGet: jest.fn(),
	policyPickDirectory: jest.fn(),
	policySetDirectories: jest.fn(),
	policySetTool: jest.fn(),
	policyReset: jest.fn(),
};
const tasksApi = {
	getPermissions: jest.fn(),
	savePermissions: jest.fn(),
	resetPermissions: jest.fn(),
};

beforeAll(() => {
	Object.defineProperty(window, 'PointerEvent', { configurable: true, value: MouseEvent });
});

beforeEach(() => {
	Object.defineProperty(window, 'agent', { configurable: true, value: agentApi });
	Object.defineProperty(window, 'tasks', { configurable: true, value: tasksApi });
	agentApi.policyGet.mockResolvedValue(permissions);
	agentApi.policyPickDirectory.mockResolvedValue(undefined);
	agentApi.policySetDirectories.mockResolvedValue(permissions);
	agentApi.policySetTool.mockResolvedValue(permissions);
	agentApi.policyReset.mockResolvedValue(permissions);
	tasksApi.getPermissions.mockResolvedValue(permissions);
	tasksApi.savePermissions.mockResolvedValue(permissions);
	tasksApi.resetPermissions.mockResolvedValue(permissions);
});

describe('Permissions settings', () => {
	it('renders directory permissions and top-level tool defaults', async () => {
		render(<PermissionsPage />);

		expect((await screen.findAllByText('read')).length).toBeGreaterThan(0);
		expect(screen.getByText('write')).toBeInTheDocument();
		expect(screen.getAllByText('edit').length).toBeGreaterThan(0);
		expect(screen.queryByText('Desktop')).not.toBeInTheDocument();
		expect(screen.queryByText('Desktop/file.txt')).not.toBeInTheDocument();
		expect(screen.getByText('/tmp')).toBeInTheDocument();
		expect(screen.getAllByText('recursive').length).toBeGreaterThan(0);
	});

	it('updates the default owned by one tool', async () => {
		const user = userEvent.setup();
		render(<PermissionsPage />);
		await screen.findByText('/tmp');

		const readDefault = screen.getAllByRole('combobox')[0];
		readDefault.focus();
		await user.keyboard('{ArrowDown}');
		await user.click(await screen.findByRole('option', { name: 'ask' }));

		await waitFor(() =>
			expect(agentApi.policySetTool).toHaveBeenCalledWith('read', {
				...permissions.read,
				default: 'ask',
			})
		);
	});

	it('adds a directory with a normalized tool allow-list', async () => {
		const user = userEvent.setup();
		render(<PermissionsPage />);
		await screen.findByText('/tmp');

		await user.type(screen.getByRole('textbox', { name: 'directoryPath' }), '/workspace');
		const tools = screen.getByRole('textbox', { name: 'directoryTools' });
		await user.clear(tools);
		await user.type(tools, 'read, write, read');
		await user.click(screen.getByRole('switch', { name: 'recursive' }));
		await user.click(screen.getByRole('button', { name: 'addDirectory' }));

		await waitFor(() =>
			expect(agentApi.policySetDirectories).toHaveBeenCalledWith({
				...permissions.dir,
				'/workspace': { recoursive: false, tools: ['read', 'write'] },
			})
		);
	});

	it('uses the directory picker and saves wildcard permissions', async () => {
		const user = userEvent.setup();
		agentApi.policyPickDirectory.mockResolvedValue('/picked');
		render(<PermissionsPage />);
		await screen.findByText('/tmp');

		await user.click(screen.getByRole('button', { name: 'browseDirectory' }));
		await waitFor(() =>
			expect(screen.getByRole('textbox', { name: 'directoryPath' })).toHaveValue('/picked')
		);
		await user.click(screen.getByRole('button', { name: 'addDirectory' }));

		await waitFor(() =>
			expect(agentApi.policySetDirectories).toHaveBeenCalledWith({
				...permissions.dir,
				'/picked': { recoursive: true, tools: '*' },
			})
		);
	});

	it('removes a directory permission', async () => {
		const user = userEvent.setup();
		render(<PermissionsPage />);
		await screen.findByText('/tmp');

		await user.click(screen.getByRole('button', { name: 'removeDirectory' }));

		await waitFor(() => expect(agentApi.policySetDirectories).toHaveBeenCalledWith({}));
	});

	it('loads and saves the task policy without changing the main policy', async () => {
		const user = userEvent.setup();
		render(<PermissionsPage scope="tasks" />);

		expect(await screen.findByText('tasksTitle')).toBeInTheDocument();
		expect(screen.getByText('nonInteractiveNotice')).toBeInTheDocument();
		await screen.findByText('/tmp');
		const readDefault = screen.getAllByRole('combobox')[0];
		readDefault.focus();
		await user.keyboard('{ArrowDown}');
		await user.click(await screen.findByRole('option', { name: 'ask' }));

		await waitFor(() =>
			expect(tasksApi.savePermissions).toHaveBeenCalledWith({
				...permissions,
				read: { ...permissions.read, default: 'ask' },
			})
		);
		expect(agentApi.policySetTool).not.toHaveBeenCalled();
		await user.click(screen.getByRole('button', { name: 'reset' }));
		await waitFor(() => expect(tasksApi.resetPermissions).toHaveBeenCalled());
		expect(agentApi.policyReset).not.toHaveBeenCalled();
	});
});
