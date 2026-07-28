export interface RecordConfig {
	url: string;
	duration: number;
}

export type RecordingStatus = 'recording' | 'stopping' | 'completed' | 'cancelled' | 'error';

export interface Recording {
	id: string;
	url: string;
	duration: number;
	status: RecordingStatus;
	startedAt: number;
	mimeType?: string;
	size?: number;
	error?: string;
}

export type RecorderCommand =
	| { type: 'start'; id: string; duration: number }
	| { type: 'stop'; id: string }
	| { type: 'cancel'; id: string };

export interface RecorderCaptureResult {
	id: string;
	base64?: string;
	mimeType?: string;
	error?: string;
}
