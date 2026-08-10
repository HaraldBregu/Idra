import type { TldrawFileParseError, TLUiOverrideHelpers } from 'tldraw';

export function openError(
	error: TldrawFileParseError,
	helpers: TLUiOverrideHelpers
): string {
	switch (error.type) {
		case 'notATldrawFile':
			return helpers.msg('file-system.file-open-error.not-a-tldraw-file');
		case 'fileFormatVersionTooNew':
			return helpers.msg('file-system.file-open-error.file-format-version-too-new');
		case 'v1File':
			return 'Legacy tldraw v1 documents are not supported by this SDK version.';
		case 'migrationFailed':
		case 'invalidRecords':
			return helpers.msg('file-system.file-open-error.generic-corrupted-file');
	}
}
