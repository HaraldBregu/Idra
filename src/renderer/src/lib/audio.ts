type ActiveCapture = {
	recorder: MediaRecorder;
	stream: MediaStream;
	chunks: Blob[];
	timer: number;
	discard: boolean;
};

const captures = new Map<string, ActiveCapture>();

function blobToBase64(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(reader.error ?? new Error('Failed to read audio data.'));
		reader.onload = () => {
			const dataUrl = reader.result as string;
			resolve(dataUrl.slice(dataUrl.indexOf(',') + 1));
		};
		reader.readAsDataURL(blob);
	});
}

function report(result: Parameters<Window['audio']['complete']>[0]): void {
	window.audio.complete(result).catch(() => undefined);
}

async function startCapture(id: string, duration: number): Promise<void> {
	try {
		const stream = await navigator.mediaDevices.getUserMedia({
			audio: { echoCancellation: true, noiseSuppression: true },
		});
		const recorder = new MediaRecorder(stream);
		const capture: ActiveCapture = { recorder, stream, chunks: [], timer: 0, discard: false };
		captures.set(id, capture);

		recorder.ondataavailable = (event): void => {
			if (event.data.size > 0) capture.chunks.push(event.data);
		};
		recorder.onstop = async (): Promise<void> => {
			window.clearTimeout(capture.timer);
			stream.getTracks().forEach((track) => track.stop());
			captures.delete(id);
			if (capture.discard) return;
			try {
				const blob = new Blob(capture.chunks, { type: recorder.mimeType || 'audio/webm' });
				const base64 = await blobToBase64(blob);
				report({ id, base64, mimeType: blob.type });
			} catch (error) {
				report({
					id,
					error: error instanceof Error ? error.message : 'Failed to read the recording.',
				});
			}
		};
		recorder.start();
		capture.timer = window.setTimeout(() => stopCapture(id, false), duration);
	} catch (error) {
		report({
			id,
			error: error instanceof Error ? error.message : 'Microphone capture failed.',
		});
	}
}

function stopCapture(id: string, discard: boolean): void {
	const capture = captures.get(id);
	if (!capture) return;
	capture.discard = capture.discard || discard;
	if (capture.recorder.state !== 'inactive') capture.recorder.stop();
}

export function initAudioCapture(): () => void {
	return window.audio.onCommand((command) => {
		if (command.type === 'start') void startCapture(command.id, command.duration);
		else stopCapture(command.id, command.type === 'cancel');
	});
}
