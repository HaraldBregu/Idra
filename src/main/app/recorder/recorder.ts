import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { BrowserWindow } from 'electron';
import type {
	RecordConfig,
	Recording,
	RecorderCaptureResult,
	RecorderCommand,
} from '../../../shared/recorder_types';

const COMPLETION_GRACE_MS = 15_000;

export interface Recorder {
	start(config: RecordConfig): Recording;
	stop(id: string): void;
	cancel(id: string): void;
	complete(result: RecorderCaptureResult): Promise<void>;
	get(id: string): Recording | undefined;
	list(): Recording[];
	waitFor(id: string): Promise<Recording>;
}

export function createRecorder(channels: { command: string; event: string }): Recorder {
	const recordings = new Map<string, Recording>();
	const waiters = new Map<string, Array<(recording: Recording) => void>>();
	const timeouts = new Map<string, NodeJS.Timeout>();

	function broadcast(channel: string, payload: unknown): void {
		BrowserWindow.getAllWindows().forEach((win) => {
			if (!win.isDestroyed()) win.webContents.send(channel, payload);
		});
	}

	function isActive(recording: Recording | undefined): recording is Recording {
		return recording?.status === 'recording' || recording?.status === 'stopping';
	}

	function set(recording: Recording): void {
		recordings.set(recording.id, recording);
		broadcast(channels.event, recording);
	}

	function sendCommand(command: RecorderCommand): void {
		broadcast(channels.command, command);
	}

	function settle(recording: Recording): void {
		set(recording);
		const timer = timeouts.get(recording.id);
		if (timer) clearTimeout(timer);
		timeouts.delete(recording.id);
		const pending = waiters.get(recording.id);
		waiters.delete(recording.id);
		pending?.forEach((resolve) => resolve(recording));
	}

	return {
		start(config) {
			const url = typeof config?.url === 'string' ? config.url.trim() : '';
			const duration = Number(config?.duration);
			if (!url) throw new Error('Recording url is required.');
			if (!Number.isFinite(duration) || duration <= 0) {
				throw new Error('Recording duration must be a positive number of milliseconds.');
			}
			if (BrowserWindow.getAllWindows().length === 0) {
				throw new Error('No app window is open to capture the recording.');
			}

			const recording: Recording = {
				id: randomUUID(),
				url,
				duration,
				status: 'recording',
				startedAt: Date.now(),
			};
			set(recording);
			sendCommand({ type: 'start', id: recording.id, duration });
			timeouts.set(
				recording.id,
				setTimeout(() => {
					const current = recordings.get(recording.id);
					if (isActive(current)) {
						settle({ ...current, status: 'error', error: 'Recording timed out.' });
					}
				}, duration + COMPLETION_GRACE_MS)
			);
			return recording;
		},
		stop(id) {
			const recording = recordings.get(id);
			if (!recording || recording.status !== 'recording') return;
			set({ ...recording, status: 'stopping' });
			sendCommand({ type: 'stop', id });
		},
		cancel(id) {
			const recording = recordings.get(id);
			if (!isActive(recording)) return;
			sendCommand({ type: 'cancel', id });
			settle({ ...recording, status: 'cancelled' });
		},
		async complete(result) {
			const recording = recordings.get(result.id);
			if (!isActive(recording)) return;

			if (result.error || !result.base64) {
				settle({
					...recording,
					status: 'error',
					error: result.error || 'Recording produced no data.',
				});
				return;
			}

			try {
				const buffer = Buffer.from(result.base64, 'base64');
				await fs.mkdir(path.dirname(recording.url), { recursive: true });
				await fs.writeFile(recording.url, buffer);
				settle({
					...recording,
					status: 'completed',
					mimeType: result.mimeType,
					size: buffer.length,
				});
			} catch (error) {
				settle({
					...recording,
					status: 'error',
					error: error instanceof Error ? error.message : String(error),
				});
			}
		},
		get(id) {
			return recordings.get(id);
		},
		list() {
			return [...recordings.values()];
		},
		waitFor(id) {
			const recording = recordings.get(id);
			if (!recording) return Promise.reject(new Error(`Unknown recording: ${id}`));
			if (!isActive(recording)) return Promise.resolve(recording);
			return new Promise((resolve) => {
				waiters.set(id, [...(waiters.get(id) ?? []), resolve]);
			});
		},
	};
}
