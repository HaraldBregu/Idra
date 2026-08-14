import type { SttAudioInput } from '../shared/stt_transcription';
import type { ChannelInboundVoice } from './channels_types';

export const CHANNEL_MAX_VOICE_BYTES = 20 * 1024 * 1024;

export async function loadChannelVoice(voice: ChannelInboundVoice): Promise<SttAudioInput> {
	const audio = await voice.load();
	const byteLength = audio.byteLength ?? Buffer.from(audio.data, 'base64').length;
	if (!audio.mimeType.startsWith('audio/')) throw new Error('Unsupported voice MIME type');
	if (byteLength > CHANNEL_MAX_VOICE_BYTES) throw new Error('Voice message is too large');
	return { ...audio, byteLength };
}
