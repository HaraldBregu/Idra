#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const filePath = process.argv[2];
if (!filePath) {
	console.error('Usage: check_csv_headers.mjs <file.csv>');
	process.exit(2);
}

const text = await readFile(filePath, 'utf8');
const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
const headers = firstLine
	.split(',')
	.map((header) => header.trim().replace(/^"|"$/g, ''))
	.filter(Boolean);

const duplicateHeaders = headers.filter((header, index) => headers.indexOf(header) !== index);
const blankHeaderCount = firstLine.split(',').filter((header) => header.trim() === '').length;

console.log(
	JSON.stringify(
		{
			filePath,
			headerCount: headers.length,
			headers,
			duplicateHeaders: [...new Set(duplicateHeaders)],
			blankHeaderCount,
			ok: duplicateHeaders.length === 0 && blankHeaderCount === 0,
		},
		null,
		2
	)
);
