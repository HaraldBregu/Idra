import { findProject } from '../../../../../src/main/agent/projects/projects_find';
import { readInstructions } from '../../../../../src/main/agent/projects/projects_instructions';
import { list } from '../../../../../src/main/agent/projects/projects_list';
import { addProjectPrompt } from '../../../../../src/main/agent/system/system_add_project_prompt';

jest.mock('../../../../../src/main/agent/projects/projects_find', () => ({ findProject: jest.fn() }));
jest.mock('../../../../../src/main/agent/projects/projects_instructions', () => ({
	readInstructions: jest.fn(),
}));
jest.mock('../../../../../src/main/agent/projects/projects_list', () => ({ list: jest.fn() }));

const listMock = jest.mocked(list);
const findProjectMock = jest.mocked(findProject);
const readInstructionsMock = jest.mocked(readInstructions);
const alpha = {
	id: 'alpha',
	title: 'Alpha',
	description: 'First project',
	folderPath: '/projects/alpha',
	instructionsPath: '/projects/alpha/AGENTS.md',
};

describe('addProjectPrompt', () => {
	beforeEach(() => {
		listMock.mockReturnValue([alpha]);
		findProjectMock.mockImplementation((name) => (name === alpha.id ? alpha : undefined));
		readInstructionsMock.mockReturnValue('Alpha instructions');
	});

	it('always includes the project list without selecting a project', () => {
		const prompt = addProjectPrompt('base');

		expect(prompt).toContain('Available projects:');
		expect(prompt).toContain('- Alpha: First project');
		expect(prompt).not.toContain('## Active project:');
		expect(readInstructionsMock).not.toHaveBeenCalled();
	});

	it('includes only the selected project instructions after selection', () => {
		const prompt = addProjectPrompt('base', 'alpha');

		expect(prompt).toContain('- Alpha: First project');
		expect(prompt).toContain('## Active project: Alpha');
		expect(prompt).toContain('Alpha instructions');
	});
});
