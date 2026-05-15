'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

type Mode = 'typewriter' | 'fade';

export type UseTextStreamOptions = {
	textStream: string | AsyncIterable<string>;
	mode?: Mode;
	speed?: number;
	fadeDuration?: number;
	segmentDelay?: number;
	characterChunkSize?: number;
	onComplete?: () => void;
	onError?: (err: unknown) => void;
};

export type UseTextStreamReturn = {
	displayedText: string;
	isComplete: boolean;
	segments: string[];
	getFadeDuration: () => number;
	getSegmentDelay: () => number;
	reset: () => void;
	startStreaming: () => void;
	pause: () => void;
	resume: () => void;
};

function clampSpeed(speed: number): number {
	return Math.max(1, Math.min(100, speed));
}

function deriveCharsPerFrame(speed: number): number {
	return Math.max(1, Math.round(speed / 10));
}

function deriveFadeDuration(speed: number): number {
	return Math.max(200, 2000 - clampSpeed(speed) * 16);
}

function deriveSegmentDelay(speed: number): number {
	return Math.max(20, 240 - clampSpeed(speed) * 2);
}

function splitSegments(text: string): string[] {
	return text.split(/(\s+)/).filter((s) => s.length > 0);
}

function useTextStream({
	textStream,
	mode = 'typewriter',
	speed = 20,
	fadeDuration,
	segmentDelay,
	characterChunkSize,
	onComplete,
	onError,
}: UseTextStreamOptions): UseTextStreamReturn {
	const [displayedText, setDisplayedText] = React.useState('');
	const [isComplete, setIsComplete] = React.useState(false);
	const [pausedFlag, setPausedFlag] = React.useState(false);
	const [resetTick, setResetTick] = React.useState(0);
	const [autoStart, setAutoStart] = React.useState(true);

	const bufferRef = React.useRef('');
	const indexRef = React.useRef(0);
	const completeRef = React.useRef(false);
	const rafRef = React.useRef<number | null>(null);
	const lastTickRef = React.useRef<number>(0);

	const chunkSize = characterChunkSize ?? deriveCharsPerFrame(speed);
	const _fadeDuration = fadeDuration ?? deriveFadeDuration(speed);
	const _segmentDelay = segmentDelay ?? deriveSegmentDelay(speed);

	React.useEffect(() => {
		setDisplayedText('');
		setIsComplete(false);
		bufferRef.current = '';
		indexRef.current = 0;
		completeRef.current = false;
	}, [resetTick]);

	React.useEffect(() => {
		if (!autoStart) return;
		let cancelled = false;

		const consume = async () => {
			try {
				if (typeof textStream === 'string') {
					bufferRef.current = textStream;
					completeRef.current = true;
				} else {
					for await (const chunk of textStream) {
						if (cancelled) return;
						bufferRef.current += chunk;
					}
					if (!cancelled) completeRef.current = true;
				}
			} catch (err) {
				onError?.(err);
			}
		};

		void consume();
		return () => {
			cancelled = true;
		};
	}, [textStream, autoStart, resetTick, onError]);

	React.useEffect(() => {
		if (!autoStart || pausedFlag) return;

		const tick = (now: number) => {
			if (pausedFlag) {
				rafRef.current = null;
				return;
			}
			if (mode === 'typewriter') {
				if (indexRef.current < bufferRef.current.length) {
					indexRef.current = Math.min(
						bufferRef.current.length,
						indexRef.current + chunkSize
					);
					setDisplayedText(bufferRef.current.slice(0, indexRef.current));
				}
				if (completeRef.current && indexRef.current >= bufferRef.current.length) {
					setIsComplete(true);
					onComplete?.();
					rafRef.current = null;
					return;
				}
			} else {
				const elapsed = now - lastTickRef.current;
				if (elapsed >= _segmentDelay) {
					lastTickRef.current = now;
					if (indexRef.current < bufferRef.current.length) {
						indexRef.current = bufferRef.current.length;
						setDisplayedText(bufferRef.current);
					}
				}
				if (completeRef.current && indexRef.current >= bufferRef.current.length) {
					setIsComplete(true);
					onComplete?.();
					rafRef.current = null;
					return;
				}
			}
			rafRef.current = requestAnimationFrame(tick);
		};

		lastTickRef.current = performance.now();
		rafRef.current = requestAnimationFrame(tick);
		return () => {
			if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
			rafRef.current = null;
		};
	}, [autoStart, pausedFlag, mode, chunkSize, _segmentDelay, resetTick, onComplete]);

	const segments = React.useMemo(() => splitSegments(displayedText), [displayedText]);

	return {
		displayedText,
		isComplete,
		segments,
		getFadeDuration: () => _fadeDuration,
		getSegmentDelay: () => _segmentDelay,
		reset: () => setResetTick((t) => t + 1),
		startStreaming: () => setAutoStart(true),
		pause: () => setPausedFlag(true),
		resume: () => setPausedFlag(false),
	};
}

export type ResponseStreamProps = {
	textStream: string | AsyncIterable<string>;
	mode?: Mode;
	speed?: number;
	className?: string;
	onComplete?: () => void;
	as?: keyof React.JSX.IntrinsicElements;
	fadeDuration?: number;
	segmentDelay?: number;
	characterChunkSize?: number;
};

function ResponseStream({
	textStream,
	mode = 'typewriter',
	speed = 20,
	className,
	onComplete,
	as = 'div',
	fadeDuration,
	segmentDelay,
	characterChunkSize,
}: ResponseStreamProps) {
	const { displayedText, segments, getFadeDuration } = useTextStream({
		textStream,
		mode,
		speed,
		fadeDuration,
		segmentDelay,
		characterChunkSize,
		onComplete,
	});

	const Tag = as as React.ElementType;

	if (mode === 'fade') {
		const duration = getFadeDuration();
		return (
			<Tag className={cn('whitespace-pre-wrap', className)}>
				{segments.map((seg, i) => (
					<span
						key={`${i}-${seg}`}
						style={{
							animation: `responseStreamFade ${duration}ms ease-out forwards`,
							animationDelay: `${i * 10}ms`,
							opacity: 0,
							display: 'inline',
						}}
					>
						{seg}
					</span>
				))}
			</Tag>
		);
	}

	return <Tag className={cn('whitespace-pre-wrap', className)}>{displayedText}</Tag>;
}

export { ResponseStream, useTextStream };
