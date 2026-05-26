import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { SkillDetails, SkillInfo } from '../../../../../../src/shared/skills';
import SkillsPage from '../../../../../../src/renderer/src/pages/settings/pages/skills/Page';
import SkillDetailsPage from '../../../../../../src/renderer/src/pages/settings/pages/skills/details/Page';

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
		name,
		description: `${name} description`,
		location: `/skills/${id}`,
	};
}

function makeSkillDetails(id: string, name: string): SkillDetails {
	return {
		...makeSkill(id, name),
		frontmatter: {
			name,
			description: `${name} description`,
			license: 'MIT',
			compatibility: 'Local only',
			allowedTools: ['web_fetch'],
		},
		instructions: '# Instructions',
		supportFiles: [{ relativePath: 'references/guide.md', kind: 'reference', size: 5 }],
	};
}

function renderSkillsPage(): ReturnType<typeof render> {
	return render(
		<MemoryRouter initialEntries={['/settings/skills']}>
			<Routes>
				<Route path="/settings/skills" element={<SkillsPage />} />
				<Route path="/settings/skills/skilldetails/:skillId" element={<div>skill detail route</div>} />
			</Routes>
		</MemoryRouter>
	);
}

function renderSkillDetailsPage(skillId = 'greet'): ReturnType<typeof render> {
	return render(
		<MemoryRouter initialEntries={[`/settings/skills/skilldetails/${skillId}`]}>
			<Routes>
				<Route path="/settings/skills" element={<div>skills list route</div>} />
				<Route path="/settings/skills/skilldetails/:skillId" element={<SkillDetailsPage />} />
			</Routes>
		</MemoryRouter>
	);
}

describe('SkillsPage', () => {
	beforeEach(() => {
		window.skills = {
			list: jest.fn(async () => []),
			load: jest.fn(async (id: string) => makeSkillDetails(id, id)),
			getRoot: jest.fn(async () => '/skills'),
			importSkill: jest.fn(async () => undefined),
			downloadSkill: jest.fn(async () => undefined),
			delete: jest.fn(async (id: string) => ({ id, name: id, deleted: true })),
		};
	});

	it('shows empty state when no skills are installed', async () => {
		renderSkillsPage();

		expect(await screen.findByText('settings.skills.empty')).toBeInTheDocument();
	});

	it('renders installed skills by name', async () => {
		(window.skills.list as jest.Mock).mockResolvedValue([
			makeSkill('greet', 'Greet'),
			makeSkill('summarize', 'Summarize'),
		]);

		renderSkillsPage();

		expect(await screen.findByText('Greet')).toBeInTheDocument();
		expect(screen.getByText('Summarize')).toBeInTheDocument();
		expect(screen.getByText('Greet description')).toBeInTheDocument();
		expect(screen.queryByText('v1.2.3')).not.toBeInTheDocument();
	});

	it('uploads a skill and refreshes the list', async () => {
		const skill = makeSkill('greet', 'Greet');
		(window.skills.importSkill as jest.Mock).mockResolvedValue({
			imported: [skill],
			skipped: [],
		});
		const user = userEvent.setup();

		renderSkillsPage();

		await screen.findByText('settings.skills.empty');
		await user.click(screen.getByRole('button', { name: 'settings.skills.upload' }));

		await waitFor(() => {
			expect(window.skills.importSkill).toHaveBeenCalled();
		});
		expect(window.skills.list).toHaveBeenCalled();
	});

	it('navigates to a skill detail page from the row', async () => {
		const skill = makeSkill('greet', 'Greet');
		(window.skills.list as jest.Mock).mockResolvedValue([skill]);
		const user = userEvent.setup();

		renderSkillsPage();

		await screen.findByText('Greet');
		await user.click(screen.getByRole('button', { name: /Greet/ }));

		expect(await screen.findByText('skill detail route')).toBeInTheDocument();
	});

	it('downloads an installed skill', async () => {
		const skill = makeSkillDetails('greet', 'greet');
		(window.skills.load as jest.Mock).mockResolvedValue(skill);
		(window.skills.downloadSkill as jest.Mock).mockResolvedValue({
			id: 'greet',
			name: 'greet',
			destinationPath: '/downloads/greet',
		});
		const user = userEvent.setup();

		renderSkillDetailsPage();

		await screen.findByRole('heading', { name: 'greet' });
		await user.click(screen.getByRole('button', { name: 'settings.skills.download' }));

		await waitFor(() => {
			expect(window.skills.downloadSkill).toHaveBeenCalledWith('greet');
		});
		expect(await screen.findByText('settings.skills.downloaded:greet:/downloads/greet')).toBeInTheDocument();
	});

	it('shows skill details on the detail page', async () => {
		const skill = makeSkillDetails('greet', 'greet');
		(window.skills.load as jest.Mock).mockResolvedValue(skill);

		renderSkillDetailsPage();

		expect(await screen.findByText('settings.skills.detailLicense')).toBeInTheDocument();
		expect(screen.getByText('MIT')).toBeInTheDocument();
		expect(screen.getByText('Local only')).toBeInTheDocument();
		expect(screen.getByText('/skills/greet')).toBeInTheDocument();
		expect(screen.getByText('references/guide.md')).toBeInTheDocument();
		expect(screen.getByText('web_fetch')).toBeInTheDocument();
	});

	it('calls delete and returns to the list after confirming', async () => {
		const skill = makeSkillDetails('greet', 'greet');
		(window.skills.load as jest.Mock).mockResolvedValue(skill);
		jest.spyOn(window, 'confirm').mockReturnValue(true);

		const user = userEvent.setup();
		renderSkillDetailsPage();

		await screen.findByRole('heading', { name: 'greet' });
		await user.click(screen.getByRole('button', { name: 'settings.skills.delete' }));

		await waitFor(() => {
			expect(window.skills.delete).toHaveBeenCalledWith('greet');
		});
		expect(await screen.findByText('skills list route')).toBeInTheDocument();
	});

	it('does not delete when the confirmation is dismissed', async () => {
		const skill = makeSkillDetails('greet', 'greet');
		(window.skills.load as jest.Mock).mockResolvedValue(skill);
		jest.spyOn(window, 'confirm').mockReturnValue(false);

		const user = userEvent.setup();
		renderSkillDetailsPage();

		await screen.findByRole('heading', { name: 'greet' });
		await user.click(screen.getByRole('button', { name: 'settings.skills.delete' }));

		expect(window.skills.delete).not.toHaveBeenCalled();
	});
});
