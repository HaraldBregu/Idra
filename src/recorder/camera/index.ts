import { RecorderChannels } from '../../shared/ipc_channels_definitions';
import { createRecorder } from '../recorder';

export const camera = createRecorder(RecorderChannels.camera);
