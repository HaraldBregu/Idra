import { aliasFileTool } from './common';
import { deleteTool } from './delete';

export const filesystemDeleteTool = aliasFileTool(
	'filesystem_delete',
	'Delete a file or directory through the centralized filesystem tool group.',
	deleteTool
);
