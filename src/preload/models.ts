import { image } from './image';
import { sound } from './sound';
import { text } from './text';
import { transcribe } from './transcribe';
import { video } from './video';
import { voice } from './voice';
import type { ModelsApi } from './index.d';

export const models: ModelsApi = { image, sound, text, transcribe, video, voice };
