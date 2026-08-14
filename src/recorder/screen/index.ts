import { RecorderChannels } from '../../shared/ipc_channels_definitions';
import { createRecorder } from '../recorder';

export const screen = createRecorder(RecorderChannels.screen);
