import path from 'node:path';
import os from 'node:os';

export function userDataLocation(): string {
	return path.join(os.homedir(), '.idra');
}
