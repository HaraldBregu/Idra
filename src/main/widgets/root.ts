import path from 'node:path';
import { userDataLocation } from '../shared/user_data_location';

export function widgetsRoot(appLocation = userDataLocation()): string {
	return path.join(appLocation, 'widgets');
}
