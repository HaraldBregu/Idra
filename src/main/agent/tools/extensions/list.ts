import { z } from 'zod';
import { listExtensions } from '../../../extensions/extension_index';
import { tool } from '../tool';

export const listExtensionsTool = tool({
	id: 'list_extensions',
	name: 'List Extensions',
	description: 'List the installed Friday extensions available to open.',
	inputSchema: z.object({}).strict(),
	execute: () => ({ extensions: listExtensions() }),
});
