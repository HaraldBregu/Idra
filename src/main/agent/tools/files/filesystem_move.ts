import { aliasFileTool } from './common';
import { moveTool } from './move';

export const filesystemMoveTool = aliasFileTool(
	'filesystem_move',
	'Move or rename a file through the centralized filesystem tool group.',
	moveTool
);
