import { Blocks } from 'lucide-react';
import { toolIcon, type ToolPart } from '../../../src/renderer/src/components/prompt-kit/tool';

it.each(['list_extensions', 'open_extensions'])('uses the extension icon for %s', (type) => {
	expect(toolIcon({ type, state: 'output-available' } satisfies ToolPart)).toBe(Blocks);
});
