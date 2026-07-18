import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PoliciesPage from '../../../src/renderer/src/pages/settings/pages/policies/Page';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({ t: (key: string) => key.split('.').at(-1) ?? key }),
}));

const policy = {
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
	policySetTool: jest.fn(),
	policyReset: jest.fn(),
};

beforeEach(() => {
	Object.defineProperty(window, 'agent', { configurable: true, value: agentApi });
	agentApi.policyGet.mockResolvedValue(policy);
	agentApi.policySetTool.mockResolvedValue(policy);
	agentApi.policyReset.mockResolvedValue(policy);
});

describe('Policies settings', () => {
	it('renders top-level tool defaults and their rules', async () => {
		render(<PoliciesPage />);

		expect((await screen.findAllByText('read')).length).toBeGreaterThan(0);
		expect(screen.getByText('write')).toBeInTheDocument();
		expect(screen.getAllByText('edit').length).toBeGreaterThan(0);
		expect(screen.getByText('Desktop')).toBeInTheDocument();
		expect(screen.getByText('Desktop/file.txt')).toBeInTheDocument();
		expect(screen.queryByText('/tmp')).not.toBeInTheDocument();
	});

	it('updates the default owned by one tool', async () => {
		const user = userEvent.setup();
		render(<PoliciesPage />);
		await screen.findByText('Desktop/file.txt');

		const readDefault = screen.getAllByRole('combobox')[0];
		readDefault.focus();
		await user.keyboard('{ArrowDown}');
		await user.click(await screen.findByRole('option', { name: 'ask' }));

		await waitFor(() =>
			expect(agentApi.policySetTool).toHaveBeenCalledWith('read', {
				...policy.read,
				default: 'ask',
			})
		);
	});

	it('adds a rule to the selected tool bucket', async () => {
		const user = userEvent.setup();
		render(<PoliciesPage />);
		await screen.findByText('Desktop/file.txt');

		await user.type(screen.getByPlaceholderText('pathPlaceholder'), '/tmp/shared');
		await user.click(screen.getByRole('button', { name: 'add' }));

		await waitFor(() =>
			expect(agentApi.policySetTool).toHaveBeenCalledWith('read', {
				...policy.read,
				allow: ['Desktop', '/tmp/shared'],
			})
		);
	});
});
