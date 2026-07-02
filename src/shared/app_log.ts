export interface AppLogEntry {
	timestamp: string;
	level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
	source: string;
	message: string;
}
