import { aliasFileTool } from './common';
import { copyTool } from './copy';
import { deleteTool } from './delete';
import { findTool } from './find';
import { moveTool } from './move';
import { readTool } from './read';
import { writeTool } from './write';

export { readTool } from './read';
export { writeTool } from './write';
export { editTool } from './edit';
export { editFileTool } from './edit_file';
export { applyPatchTool } from './apply-patch';
export { deleteTool } from './delete';
export { copyTool } from './copy';
export { moveTool } from './move';
export { inspectFileTool } from './inspect-file';
export { findTool } from './find';
export { filesystemCreateTool } from './filesystem-create';
export { filesystemListTool } from './filesystem-list';
export { gitDiffTool } from './git_diff';
export { gitStatusTool } from './git_status';
export { grepTool } from './grep';
export { listDirectoryTool } from './list_directory';
export { readFileTool } from './read_file';
export { runShellTool } from './run_shell';
export { searchFilesTool } from './search_files';
export { undoLastOperationTool } from './undo_last_operation';

export const filesystemReadTool = aliasFileTool(
	'filesystem_read',
	'Read a UTF-8 file through the centralized filesystem tool group.',
	readTool
);

export const filesystemUpdateTool = aliasFileTool(
	'filesystem_update',
	'Update or overwrite a UTF-8 file through the centralized filesystem tool group.',
	writeTool
);

export const filesystemDeleteTool = aliasFileTool(
	'filesystem_delete',
	'Delete a file or directory through the centralized filesystem tool group.',
	deleteTool
);

export const filesystemMoveTool = aliasFileTool(
	'filesystem_move',
	'Move or rename a file through the centralized filesystem tool group.',
	moveTool
);

export const filesystemCopyTool = aliasFileTool(
	'filesystem_copy',
	'Copy a file or directory through the centralized filesystem tool group.',
	copyTool
);

export const filesystemSearchTool = aliasFileTool(
	'filesystem_search',
	'Search files by glob pattern through the centralized filesystem tool group.',
	findTool
);
