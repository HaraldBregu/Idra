import { randomUUID } from 'node:crypto';
import { BrowserWindow } from 'electron';
import type { AudioRecordConfig, AudioRecording } from '../../shared/audio_types';
import { armTimeout, sendCommand, setRecording } from './audio_store';

const COMPLETION_GRACE_MS = 15_000;

export function startRecording(config: AudioRecordConfig): AudioRecording {
	const url = typeof config?.url === 'string' ? config.url.trim() : '';
	const duration = Number(config?.duration);
	if (!url) throw new Error('Recording url is required.');
	if (!Number.isFinite(duration) || duration <= 0) {
		throw new Error('Recording duration must be a positive number of milliseconds.');
	}
	if (BrowserWindow.getAllWindows().length === 0) {
		throw new Error('No app window is open to capture audio.');
	}

	const recording: AudioRecording = {
		id: randomUUID(),
		url,
		duration,
		status: 'recording',
		startedAt: Date.now(),
	};
	setRecording(recording);
	sendCommand({ type: 'start', id: recording.id, duration });
	armTimeout(recording.id, duration + COMPLETION_GRACE_MS);
	return recording;
}
