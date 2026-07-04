import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, LoaderCircle, Mic, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAudioRecorder } from '@/pages/home/hooks';
import { fileToSttAudioInput } from '@/pages/home/hooks/stt';
import { SettingsNotice, SettingsPanel } from '../../components';

const TranscribeTest: React.FC = () => {
	const { t } = useTranslation();
	const recorder = useAudioRecorder();
	const [transcribing, setTranscribing] = useState(false);
	const [transcript, setTranscript] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const isRecording = recorder.status === 'recording';
	const errorMessage = error ?? recorder.errorMessage;

	const handleToggle = async (): Promise<void> => {
		setError(null);
		if (!isRecording) {
			setTranscript(null);
			await recorder.start();
			return;
		}

		setTranscribing(true);
		try {
			const recording = await recorder.stop();
			if (!recording) return;
			try {
				const result = await window.transcribe.transcribe({
					audio: await fileToSttAudioInput(recording.file),
				});
				setTranscript(result.text);
			} finally {
				if (recording.url) URL.revokeObjectURL(recording.url);
			}
		} catch (err) {
			setError(
				err instanceof Error && err.message.trim()
					? err.message
					: t('settings.modelServices.testTranscribeError')
			);
		} finally {
			setTranscribing(false);
		}
	};

	return (
		<SettingsPanel>
			<div className="grid gap-3 px-3 py-3">
				{errorMessage && (
					<SettingsNotice variant="destructive" icon={AlertTriangle}>
						{errorMessage}
					</SettingsNotice>
				)}
				<p className="text-[11px] leading-4 text-muted-foreground">
					{t('settings.modelServices.testTranscribeHint')}
				</p>
				{transcript !== null && (
					<p className="rounded-md border border-border/70 bg-muted/40 px-2 py-1.5 text-xs text-foreground">
						{transcript.trim() || t('settings.modelServices.testTranscribeEmpty')}
					</p>
				)}
				<div className="flex justify-end">
					<Button
						type="button"
						size="sm"
						variant={isRecording ? 'destructive' : 'default'}
						disabled={transcribing || !recorder.isSupported}
						onClick={() => void handleToggle()}
					>
						{transcribing ? (
							<LoaderCircle className="size-3 animate-spin" />
						) : isRecording ? (
							<Square className="size-3" />
						) : (
							<Mic className="size-3" />
						)}
						{transcribing
							? t('settings.modelServices.testTranscribeTranscribing')
							: isRecording
								? t('settings.modelServices.testTranscribeStop')
								: t('settings.modelServices.testTranscribeRecord')}
					</Button>
				</div>
			</div>
		</SettingsPanel>
	);
};

export default TranscribeTest;
