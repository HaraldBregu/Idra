import { createElement } from 'react';
import { render } from '@testing-library/react';
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
});
