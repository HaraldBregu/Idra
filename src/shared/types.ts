export interface AppLogEntry {
	timestamp: string;
	level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
	source: string;
	message: string;
}


// ---- IPC Result

interface IpcError {
	success: false;
	error: {
		code: string;
		message: string;
		stack?: string;
	};
}

interface IpcSuccess<T> {
	success: true;
	data: T;
}

/**
 * Union type for IPC responses.
 */
export type IpcResult<T> = IpcSuccess<T> | IpcError;
