import { aliasFileTool } from './common';
import { readTool } from './read';

export const filesystemReadTool = aliasFileTool(
	'filesystem_read',
	'Read a UTF-8 file through the centralized filesystem tool group.',
	readTool
);
