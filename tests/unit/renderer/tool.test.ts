import { FolderKanban, Wrench } from 'lucide-react';
import { toolIcon, type ToolPart } from '../../../src/renderer/src/components/prompt-kit/tool';

function toolPart(type: string): ToolPart {
	return { type, state: 'output-available' };
}

describe('toolIcon', () => {
	it('uses the project icon for project tools', () => {
		expect(toolIcon(toolPart('project_create'))).toBe(FolderKanban);
		expect(toolIcon(toolPart('PROJECT_LIST'))).toBe(FolderKanban);
		expect(toolIcon({ ...toolPart('project_select'), serviceKind: 'mcp' })).toBe(FolderKanban);
		expect(toolIcon(toolPart('custom_tool'))).toBe(Wrench);
	});
});
