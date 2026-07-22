import { readFileSync, writeFileSync } from 'node:fs';

function insertAfter(obj, afterKey, key, value) {
	if (key in obj) return obj;
	const out = {};
	for (const [k, v] of Object.entries(obj)) {
		out[k] = v;
		if (k === afterKey) out[key] = value;
	}
	if (!(key in out)) out[key] = value; // fallback: append
	return out;
}

const CONTENT = {
	en: {
		tab: 'Cloud',
		description: 'S3-compatible object storage',
		block: {
			description: 'Connect an S3-compatible bucket to store, retrieve and sync objects.',
			connectionTitle: 'Connection',
			endpoint: 'Endpoint URL',
			region: 'Region',
			bucket: 'Bucket',
			accessKeyId: 'Access key ID',
			secretAccessKey: 'Secret access key',
			forcePathStyle: 'Force path-style',
			forcePathStyleDescription: 'Required by MinIO and some S3-compatible providers.',
			test: 'Test connection',
			testing: 'Testing…',
			testOk: 'Connection successful.',
			save: 'Save',
			saving: 'Saving…',
			saved: 'Cloud settings saved.',
			localNote:
				"Credentials stay in Friday's local app data and are only sent to the configured storage endpoint.",
			errors: {
				load: 'Could not load cloud settings.',
				save: 'Could not save cloud settings.',
				test: 'Connection failed.',
			},
		},
	},
	it: {
		tab: 'Cloud',
		description: 'Archiviazione oggetti compatibile con S3',
		block: {
			description:
				'Collega un bucket compatibile con S3 per archiviare, recuperare e sincronizzare oggetti.',
			connectionTitle: 'Connessione',
			endpoint: 'URL endpoint',
			region: 'Regione',
			bucket: 'Bucket',
			accessKeyId: 'ID chiave di accesso',
			secretAccessKey: 'Chiave di accesso segreta',
			forcePathStyle: 'Forza path-style',
			forcePathStyleDescription: 'Richiesto da MinIO e da alcuni provider compatibili con S3.',
			test: 'Prova connessione',
			testing: 'Verifica…',
			testOk: 'Connessione riuscita.',
			save: 'Salva',
			saving: 'Salvataggio…',
			saved: 'Impostazioni cloud salvate.',
			localNote:
				"Le credenziali restano nei dati locali di Friday e vengono inviate solo all'endpoint di archiviazione configurato.",
			errors: {
				load: 'Impossibile caricare le impostazioni cloud.',
				save: 'Impossibile salvare le impostazioni cloud.',
				test: 'Connessione non riuscita.',
			},
		},
	},
};

for (const locale of ['en', 'it']) {
	const path = `resources/i18n/${locale}/main.json`;
	const data = JSON.parse(readFileSync(path, 'utf8'));
	const c = CONTENT[locale];
	const s = data.settings;
	s.tabs = insertAfter(s.tabs, 'searchEngine', 'cloud', c.tab);
	s.overview.descriptions = insertAfter(
		s.overview.descriptions,
		'searchEngine',
		'cloud',
		c.description
	);
	data.settings = insertAfter(s, 'searchEngine', 'cloud', c.block);
	writeFileSync(path, JSON.stringify(data, null, '\t') + '\n');
	console.log(`updated ${path}`);
}
