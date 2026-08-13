export function formatUploadedTextFile(text: string): string {
	return [
		'[Complete contents of the uploaded text file]',
		'--- BEGIN UPLOADED CONTENT ---',
		text,
		'--- END UPLOADED CONTENT ---',
	].join('\n');
}
