export interface AudioRecordConfig {
	url: string;
	duration: number;
}

export type AudioRecordingStatus = 'recording' | 'stopping' | 'completed' | 'cancelled' | 'error';

export interface AudioRecording {
	id: string;
	url: string;
	duration: number;
	status: AudioRecordingStatus;
	startedAt: number;
	mimeType?: string;
	size?: number;
	error?: string;
}

export type AudioCaptureCommand =
	| { type: 'start'; id: string; duration: number }
	| { type: 'stop'; id: string }
	| { type: 'cancel'; id: string };

export interface AudioCaptureResult {
	id: string;
	base64?: string;
	mimeType?: string;
	error?: string;
}
