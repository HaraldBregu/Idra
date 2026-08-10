import { filterTools } from '../../../../../src/main/agent/runner/run_tools';
import { jsonTool } from '../../../../../src/main/agent/tools/tool';

function namedTool(id: string) {
	return jsonTool({
		id,
		name: id,
		description: id,
		schema: { type: 'object' },
		execute: () => undefined,
	});
}

const tools = [namedTool('read_file'), namedTool('write_file'), namedTool('search_web')];

it('keeps the normal catalog when the allowlist is omitted', () => {
	expect(filterTools(tools)).toEqual(tools);
});

it('treats an empty allowlist as no tools', () => {
	expect(filterTools(tools, [])).toEqual([]);
});

it('applies exact allow and deny tool IDs', () => {
	expect(filterTools(tools, ['read_file', 'search'], ['read'])).toEqual([tools[0]]);
	expect(filterTools(tools, ['read_file', 'search_web'], ['search_web'])).toEqual([tools[0]]);
});
