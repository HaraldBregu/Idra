import { aliasFileTool } from './common';
import { copyTool } from './copy';

export const filesystemCopyTool = aliasFileTool(
	'filesystem_copy',
	'Copy a file or directory through the centralized filesystem tool group.',
	copyTool
);
