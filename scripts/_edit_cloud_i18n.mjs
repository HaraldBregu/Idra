import { readFileSync, writeFileSync } from 'node:fs';

const PATCH = {
	en: {
		description: 'S3-compatible object storage.',
		edit: 'Edit',
		cancel: 'Cancel',
		endpointDefault: 'AWS default',
	},
	it: {
		description: 'Archiviazione oggetti compatibile con S3.',
		edit: 'Modifica',
		cancel: 'Annulla',
		endpointDefault: 'Predefinito AWS',
	},
};

for (const locale of ['en', 'it']) {
	const path = `resources/i18n/${locale}/main.json`;
	const data = JSON.parse(readFileSync(path, 'utf8'));
	Object.assign(data.settings.cloud, PATCH[locale]);
	writeFileSync(path, JSON.stringify(data, null, '\t') + '\n');
	console.log(`updated ${path}`);
}
