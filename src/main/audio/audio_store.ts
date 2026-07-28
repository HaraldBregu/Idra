import { BrowserWindow } from 'electron';
import { AudioChannels } from '../../shared/ipc_channels_definitions';
import type { AudioCaptureCommand, AudioRecording } from '../../shared/audio_types';

const recordings = new Map<string, AudioRecording>();
const waiters = new Map<string, Array<(recording: AudioRecording) => void>>();
const timeouts = new Map<string, NodeJS.Timeout>();

function broadcast(channel: string, payload: unknown): void {
	BrowserWindow.getAllWindows().forEach((win) => {
		if (!win.isDestroyed()) win.webContents.send(channel, payload);
	});
}

export function getRecording(id: string): AudioRecording | undefined {
	return recordings.get(id);
}

export function listRecordings(): AudioRecording[] {
	return [...recordings.values()];
}

export function isActive(recording: AudioRecording | undefined): recording is AudioRecording {
	return recording?.status === 'recording' || recording?.status === 'stopping';
}

export function setRecording(recording: AudioRecording): void {
	recordings.set(recording.id, recording);
	broadcast(AudioChannels.event, recording);
}

export function sendCommand(command: AudioCaptureCommand): void {
	broadcast(AudioChannels.command, command);
}

export function waitForRecording(id: string): Promise<AudioRecording> {
	const recording = recordings.get(id);
	if (!recording) return Promise.reject(new Error(`Unknown audio recording: ${id}`));
	if (!isActive(recording)) return Promise.resolve(recording);
	return new Promise((resolve) => {
		waiters.set(id, [...(waiters.get(id) ?? []), resolve]);
	});
}

export function settleRecording(recording: AudioRecording): void {
	setRecording(recording);
	const timer = timeouts.get(recording.id);
	if (timer) clearTimeout(timer);
	timeouts.delete(recording.id);
	const pending = waiters.get(recording.id);
	waiters.delete(recording.id);
	pending?.forEach((resolve) => resolve(recording));
}

export function armTimeout(id: string, ms: number): void {
	timeouts.set(
		id,
		setTimeout(() => {
			const recording = recordings.get(id);
			if (isActive(recording)) {
				settleRecording({ ...recording, status: 'error', error: 'Recording timed out.' });
			}
		}, ms)
	);
}
