import { getRecording, isActive, sendCommand, settleRecording } from './audio_store';

export function cancelRecording(id: string): void {
	const recording = getRecording(id);
	if (!isActive(recording)) return;
	sendCommand({ type: 'cancel', id });
	settleRecording({ ...recording, status: 'cancelled' });
}
