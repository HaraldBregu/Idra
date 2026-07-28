import { RecorderChannels } from '../../shared/ipc_channels_definitions';
import { createRecorder } from './recorder';

export type { Recorder } from './recorder';

export const audioRecorder = createRecorder(RecorderChannels.audio);
export const videoRecorder = createRecorder(RecorderChannels.video);
