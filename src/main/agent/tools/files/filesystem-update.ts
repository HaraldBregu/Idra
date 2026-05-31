import { aliasFileTool } from './common';
import { writeTool } from './write';

export const filesystemUpdateTool = aliasFileTool(
	'filesystem_update',
	'Update or overwrite a UTF-8 file through the centralized filesystem tool group.',
	writeTool
);
