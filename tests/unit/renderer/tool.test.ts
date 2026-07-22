import { createElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { FolderKanban, Wrench } from 'lucide-react';
import { toolIcon, type ToolPart } from '../../../src/renderer/src/components/prompt-kit/tool';
import { ToolActivityGroup } from '../../../src/renderer/src/pages/home/components/ToolActivityGroup';

function toolPart(type: string): ToolPart {
	return { type, state: 'output-available' };
}

describe('toolIcon', () => {
	it('uses the project icon for project tools', () => {
		expect(toolIcon(toolPart('project_create'))).toBe(FolderKanban);
		expect(toolIcon(toolPart('CREATE_PROJECT'))).toBe(FolderKanban);
		expect(toolIcon(toolPart('list_projects'))).toBe(FolderKanban);
		expect(toolIcon({ ...toolPart('select_project'), serviceKind: 'mcp' })).toBe(FolderKanban);
		expect(toolIcon(toolPart('custom_tool'))).toBe(Wrench);
	});

	it('renders the project icon in Home assistant tool activity', () => {
		const { container } = render(
			createElement(ToolActivityGroup, {
				tools: [{ ...toolPart('create_project'), toolCallId: 'project-tool' }],
			})
		);

		expect(container.querySelector('svg.lucide-folder-kanban')).toBeInTheDocument();
	});

	it('groups adjacent project tools in Home assistant tool activity', () => {
		const { container } = render(
			createElement(ToolActivityGroup, {
				tools: [
					{ ...toolPart('create_project'), toolCallId: 'create-project', durationMs: 120 },
					{ ...toolPart('list_projects'), toolCallId: 'list-projects', durationMs: 230 },
				],
			})
		);

		const group = screen.getByRole('button', { name: /Used 2 project tools 350ms/ });
		expect(container.querySelectorAll('svg.lucide-folder-kanban')).toHaveLength(1);

		fireEvent.click(group);

		expect(screen.getByRole('button', { name: /Create project/ })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /List projects/ })).toBeInTheDocument();
	});
});
