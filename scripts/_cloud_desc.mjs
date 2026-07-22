import { readFileSync, writeFileSync } from 'node:fs';

const DESC = {
	en: 'S3-compatible object storage for your files.',
	it: 'Archiviazione oggetti compatibile con S3 per i file.',
};

for (const locale of ['en', 'it']) {
	const path = `resources/i18n/${locale}/main.json`;
	const data = JSON.parse(readFileSync(path, 'utf8'));
	data.settings.cloud.description = DESC[locale];
	writeFileSync(path, JSON.stringify(data, null, '\t') + '\n');
	console.log(`updated ${path}`);
}
