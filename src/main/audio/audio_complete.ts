import fs from 'node:fs/promises';
import path from 'node:path';
import type { AudioCaptureResult } from '../../shared/audio_types';
import { getRecording, isActive, settleRecording } from './audio_store';

export async function completeRecording(result: AudioCaptureResult): Promise<void> {
	const recording = getRecording(result.id);
	if (!isActive(recording)) return;

	if (result.error || !result.base64) {
		settleRecording({
			...recording,
			status: 'error',
			error: result.error || 'Recording produced no audio.',
		});
		return;
	}

	try {
		const buffer = Buffer.from(result.base64, 'base64');
		await fs.mkdir(path.dirname(recording.url), { recursive: true });
		await fs.writeFile(recording.url, buffer);
		settleRecording({
			...recording,
			status: 'completed',
			mimeType: result.mimeType,
			size: buffer.length,
		});
	} catch (error) {
		settleRecording({
			...recording,
			status: 'error',
			error: error instanceof Error ? error.message : String(error),
		});
	}
}
