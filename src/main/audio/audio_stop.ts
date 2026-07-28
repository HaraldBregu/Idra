import { getRecording, sendCommand, setRecording } from './audio_store';

export function stopRecording(id: string): void {
	const recording = getRecording(id);
	if (!recording || recording.status !== 'recording') return;
	setRecording({ ...recording, status: 'stopping' });
	sendCommand({ type: 'stop', id });
}
