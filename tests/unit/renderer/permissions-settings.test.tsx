import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PermissionsPage from '../../../src/renderer/src/pages/settings/pages/permissions/Page';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({ t: (key: string) => key.split('.').at(-1) ?? key }),
}));

const permissions = {
	tools: {
		read_file: { default: 'allow' as const, allow: ['Desktop'], deny: [], ask: [] },
		write_file: { default: 'allow' as const, allow: [], deny: [], ask: [] },
		edit_file: {
			default: 'ask' as const,
			allow: ['Desktop/file.txt'],
			deny: [],
			ask: [],
		},
	},
	directories: [
		{
			path: '/tmp',
			enabled: true,
			recoursive: true,
			tools: ['read_file'],
		},
	],
};

const agentApi = {
	policyGet: jest.fn(),
	policyPickDirectory: jest.fn(),
	policySetDirectories: jest.fn(),
	policySetTool: jest.fn(),
	policyReset: jest.fn(),
};

beforeAll(() => {
	Object.defineProperty(window, 'PointerEvent', { configurable: true, value: MouseEvent });
});

beforeEach(() => {
	jest.clearAllMocks();
	Object.defineProperty(window, 'agent', { configurable: true, value: agentApi });
	agentApi.policyGet.mockResolvedValue(permissions);
	agentApi.policyPickDirectory.mockResolvedValue(undefined);
	agentApi.policySetDirectories.mockResolvedValue(permissions);
	agentApi.policySetTool.mockResolvedValue(permissions);
	agentApi.policyReset.mockResolvedValue(permissions);
});

describe('Permissions settings', () => {
	it('renders directory permissions and tool defaults', async () => {
		render(<PermissionsPage />);

		expect((await screen.findAllByText('read_file')).length).toBeGreaterThan(0);
		expect(screen.getByText('write_file')).toBeInTheDocument();
		expect(screen.getByText('edit_file')).toBeInTheDocument();
		expect(screen.queryByText('Desktop')).not.toBeInTheDocument();
		expect(screen.getByText('/tmp')).toBeInTheDocument();
	});

	it('does not implicitly prefill the workspace', async () => {
		render(<PermissionsPage />);

		expect(await screen.findByRole('textbox', { name: 'directoryPath' })).toHaveValue('');
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
			expect(agentApi.policySetTool).toHaveBeenCalledWith('read_file', {
				...permissions.tools.read_file,
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
		await user.type(tools, 'read_file, write_file, read_file');
		await user.click(screen.getByRole('switch', { name: 'recursive' }));
		await user.click(screen.getByRole('button', { name: 'addDirectory' }));

		await waitFor(() =>
			expect(agentApi.policySetDirectories).toHaveBeenCalledWith([
				...permissions.directories,
				{
					path: '/workspace',
					enabled: true,
					recoursive: false,
					tools: ['read_file', 'write_file'],
				},
			])
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
			expect(agentApi.policySetDirectories).toHaveBeenCalledWith([
				...permissions.directories,
				{
					path: '/picked',
					enabled: true,
					recoursive: true,
					tools: '*',
				},
			])
		);
	});

	it('removes every explicitly configured directory', async () => {
		const user = userEvent.setup();
		render(<PermissionsPage />);
		await screen.findByText('/tmp');

		await user.click(screen.getByRole('button', { name: 'removeDirectory' }));

		await waitFor(() => expect(agentApi.policySetDirectories).toHaveBeenCalledWith([]));
	});
});
