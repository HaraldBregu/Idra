import * as React from 'react';
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
declare function useTextStream({ textStream, mode, speed, fadeDuration, segmentDelay, characterChunkSize, onComplete, onError, }: UseTextStreamOptions): UseTextStreamReturn;
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
declare function ResponseStream({ textStream, mode, speed, className, onComplete, as, fadeDuration, segmentDelay, characterChunkSize, }: ResponseStreamProps): import("react/jsx-runtime").JSX.Element;
export { ResponseStream, useTextStream };
