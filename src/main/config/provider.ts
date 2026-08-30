import fs from 'node:fs';
import path from 'node:path';
import type { ProviderConfiguration } from '../provider/types';
import { userDataLocation } from '../shared/user_data_location';
import { decodeConfigurationKey } from './key';
import { ConfigurationStore } from './store';

export function configuredProvider(): ProviderConfiguration | undefined {
	const rawKey = process.env.IDRA_CONFIG_KEY?.trim();
	const directory = userDataLocation();
	if (!rawKey || !fs.existsSync(path.join(directory, 'secure-config.json'))) return undefined;
	return new ConfigurationStore(directory, decodeConfigurationKey(rawKey)).provider();
}
