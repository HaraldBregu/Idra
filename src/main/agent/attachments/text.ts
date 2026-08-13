export function formatUploadedTextFile(input: {
	name: string;
	mimeType: string;
	bytes: number;
	text: string;
}): string {
	return [
		'[Uploaded text file]',
		`Name: ${input.name}`,
		`MIME type: ${input.mimeType}`,
		`Size: ${input.bytes} bytes`,
		'The complete file content is included inline below. Read it directly from this block; the name is metadata, not a filesystem path, and no file tool is needed.',
		`--- BEGIN UPLOADED FILE: ${input.name} ---`,
		input.text,
		`--- END UPLOADED FILE: ${input.name} ---`,
	].join('\n');
}
