import path from 'node:path';
import Store from 'electron-store';
import type { CloudConfig } from '../../shared/cloud_types';
import { userDataLocation } from '../shared/user_data_location';

export const DEFAULT_CLOUD_CONFIG: CloudConfig = {
	endpoint: '',
	region: 'us-east-1',
	accessKeyId: '',
	secretAccessKey: '',
	bucket: '',
	forcePathStyle: false,
};

const store = new Store<CloudConfig>({
	name: 'settings',
	cwd: path.resolve(userDataLocation(), 'cloud'),
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_CLOUD_CONFIG,
});

export function getCloudConfig(): CloudConfig {
	return store.store;
}

export function setCloudConfig(config: CloudConfig): CloudConfig {
	store.store = { ...DEFAULT_CLOUD_CONFIG, ...config };
	return store.store;
}
