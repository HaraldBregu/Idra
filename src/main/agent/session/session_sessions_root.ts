import path from 'node:path';
import type { SessionCategory } from './session_types';

export function sessionsRoot(location: string, category: SessionCategory): string {
	return path.join(path.resolve(location), 'sessions', category);
}
