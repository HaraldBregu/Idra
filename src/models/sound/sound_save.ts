import fs from 'node:fs/promises';
import path from 'node:path';
import { userDataLocation } from '../../shared/user_data_location';
import type { SoundResult } from '../../shared/sound_types';

export async function saveSoundFile(result: SoundResult): Promise<void> {
	const ext = result.mimeType.includes('mpeg')
		? 'mp3'
		: result.mimeType.split('/')[1]?.split('+')[0] || 'mp3';
	const soundDir = path.resolve(userDataLocation(), 'sound');
	await fs.mkdir(soundDir, { recursive: true });
	await fs.writeFile(
		path.join(soundDir, `sound-${Date.now()}.${ext}`),
		Buffer.from(result.base64, 'base64')
	);
}
