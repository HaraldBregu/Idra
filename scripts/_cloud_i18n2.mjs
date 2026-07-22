import { readFileSync, writeFileSync } from 'node:fs';

const PATCH = {
	en: {
		connectionDescription: 'Credentials for your S3-compatible bucket.',
		credentialsTitle: 'Credentials',
		optionsTitle: 'Options',
		enabled: 'Enabled',
		disabled: 'Disabled',
	},
	it: {
		connectionDescription: 'Credenziali per il tuo bucket compatibile con S3.',
		credentialsTitle: 'Credenziali',
		optionsTitle: 'Opzioni',
		enabled: 'Attivo',
		disabled: 'Disattivato',
	},
};

for (const locale of ['en', 'it']) {
	const path = `resources/i18n/${locale}/main.json`;
	const data = JSON.parse(readFileSync(path, 'utf8'));
	Object.assign(data.settings.cloud, PATCH[locale]);
	writeFileSync(path, JSON.stringify(data, null, '\t') + '\n');
	console.log(`updated ${path}`);
}
