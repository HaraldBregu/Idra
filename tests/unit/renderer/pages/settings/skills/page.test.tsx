import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SkillInfo } from '../../../../../../src/shared/skills';
import SkillsPage from '../../../../../../src/renderer/src/pages/settings/pages/skills/Page';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string, params?: Record<string, string>) => {
			if (params?.name && params.path) return `${key}:${params.name}:${params.path}`;
			if (params?.name) return `${key}:${params.name}`;
			if (params?.count) return `${key}:${params.count}:${params.skipped ?? '0'}`;
			return key;
		},
	}),
}));

function makeSkill(id: string, name: string): SkillInfo {
	return {
		id,
		folderPath: `/skills/${id}`,
		skillPath: `/skills/${id}/SKILL.md`,
		structure: {
			format: 'agent-skill',
			standard: 'agentskills.io',
			kind: 'direct',
			resourceDirectories: ['references'],
		},
		manifest: {
			name,
			description: `${name} description`,
			version: '1.2.3',
			category: 'workflow',
			allowedTools: ['web_fetch'],
			tags: ['test'],
		},
	};
}

describe('SkillsPage', () => {
	beforeEach(() => {
		window.skills = {
			list: jest.fn(async () => []),
			getRoot: jest.fn(async () => '/skills'),
			importSkill: jest.fn(async () => undefined),
			downloadSkill: jest.fn(async () => undefined),
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
		expect(screen.getAllByText('v1.2.3')).toHaveLength(2);
	});

	it('uploads a skill and refreshes the list', async () => {
		const skill = makeSkill('greet', 'Greet');
		(window.skills.importSkill as jest.Mock).mockResolvedValue({
			imported: [skill],
			skipped: [],
		});
		const user = userEvent.setup();

		render(<SkillsPage />);

		await screen.findByText('settings.skills.empty');
		await user.click(screen.getByRole('button', { name: 'settings.skills.upload' }));

		await waitFor(() => {
			expect(window.skills.importSkill).toHaveBeenCalled();
		});
		expect(window.skills.list).toHaveBeenCalled();
	});

	it('shows skill details', async () => {
		const skill = makeSkill('greet', 'Greet');
		(window.skills.list as jest.Mock).mockResolvedValue([skill]);
		const user = userEvent.setup();

		render(<SkillsPage />);

		await screen.findByText('Greet');
		await user.click(screen.getByRole('button', { name: 'settings.skills.details' }));

		expect(screen.getByText('settings.skills.detailVersion')).toBeInTheDocument();
		expect(screen.getByText('agentskills.io')).toBeInTheDocument();
		expect(screen.getByText('1.2.3')).toBeInTheDocument();
		expect(screen.getByText('/skills/greet/SKILL.md')).toBeInTheDocument();
		expect(screen.getByText('web_fetch')).toBeInTheDocument();
	});

	it('downloads an installed skill', async () => {
		const skill = makeSkill('greet', 'Greet');
		(window.skills.list as jest.Mock).mockResolvedValue([skill]);
		(window.skills.downloadSkill as jest.Mock).mockResolvedValue({
			id: 'greet',
			destinationPath: '/downloads/greet',
		});
		const user = userEvent.setup();

		render(<SkillsPage />);

		await screen.findByText('Greet');
		await user.click(screen.getByRole('button', { name: 'settings.skills.download' }));

		await waitFor(() => {
			expect(window.skills.downloadSkill).toHaveBeenCalledWith('greet');
		});
		expect(await screen.findByText('settings.skills.downloaded:Greet:/downloads/greet')).toBeInTheDocument();
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
