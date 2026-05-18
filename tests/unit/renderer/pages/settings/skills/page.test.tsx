import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SkillInfo } from '../../../../../src/shared/skills';
import SkillsPage from '../../../../../src/renderer/src/pages/settings/pages/SkillsPage';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string, params?: Record<string, string>) => {
			if (params?.name) return `${key}:${params.name}`;
			return key;
		},
	}),
}));

function makeSkill(id: string, name: string): SkillInfo {
	return {
		id,
		folderPath: `/skills/${id}`,
		manifest: { name, description: `${name} description` },
	};
}

describe('SkillsPage', () => {
	beforeEach(() => {
		window.skills = {
			list: jest.fn(async () => []),
			getRoot: jest.fn(async () => '/skills'),
			importSkill: jest.fn(async () => undefined),
			delete: jest.fn(async () => undefined),
		};
	});

	it('shows empty state when no skills are installed', async () => {
		render(<SkillsPage />);

		expect(await screen.findByText('settings.skills.empty')).toBeInTheDocument();
	});

	it('renders installed skills by name', async () => {
		(window.skills.list as jest.Mock).mockResolvedValue([
			makeSkill('greet', 'Greet'),
			makeSkill('summarize', 'Summarize'),
		]);

		render(<SkillsPage />);

		expect(await screen.findByText('Greet')).toBeInTheDocument();
		expect(screen.getByText('Summarize')).toBeInTheDocument();
	});

	it('calls delete and refreshes the list after confirming', async () => {
		const skill = makeSkill('greet', 'Greet');
		(window.skills.list as jest.Mock).mockResolvedValue([skill]);
		jest.spyOn(window, 'confirm').mockReturnValue(true);

		const user = userEvent.setup();
		render(<SkillsPage />);

		await screen.findByText('Greet');
		await user.click(screen.getByRole('button', { name: 'settings.skills.delete' }));

		await waitFor(() => {
			expect(window.skills.delete).toHaveBeenCalledWith('greet');
		});
	});

	it('does not delete when the confirmation is dismissed', async () => {
		const skill = makeSkill('greet', 'Greet');
		(window.skills.list as jest.Mock).mockResolvedValue([skill]);
		jest.spyOn(window, 'confirm').mockReturnValue(false);

		const user = userEvent.setup();
		render(<SkillsPage />);

		await screen.findByText('Greet');
		await user.click(screen.getByRole('button', { name: 'settings.skills.delete' }));

		expect(window.skills.delete).not.toHaveBeenCalled();
	});
});
