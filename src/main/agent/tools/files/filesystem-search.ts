import { aliasFileTool } from './common';
import { findTool } from './find';

export const filesystemSearchTool = aliasFileTool(
	'filesystem_search',
	'Search files by glob pattern through the centralized filesystem tool group.',
	findTool
);
