import fs from 'node:fs/promises';
import path from 'node:path';
import { userDataLocation } from '../shared/user_data_location';
import type { VideoResult } from '../../shared/video_types';

export async function saveVideoFile(result: VideoResult): Promise<void> {
	const ext = result.mimeType.split('/')[1]?.split('+')[0] || 'mp4';
	const videoDir = path.resolve(userDataLocation(), 'video');
	await fs.mkdir(videoDir, { recursive: true });
	await fs.writeFile(
		path.join(videoDir, `video-${Date.now()}.${ext}`),
		Buffer.from(result.base64, 'base64')
	);
}
