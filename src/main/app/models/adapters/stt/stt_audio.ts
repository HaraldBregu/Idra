import { toFile } from 'openai/uploads';
import type { SttAudioInput } from '../../../../../shared/stt_transcription';

export function createAudioFile(audio: SttAudioInput): Promise<File> {
	const bytes = Buffer.from(audio.data, 'base64');
	return toFile(bytes, audio.fileName ?? 'audio', { type: audio.mimeType });
}
