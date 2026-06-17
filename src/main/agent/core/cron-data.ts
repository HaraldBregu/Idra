import type { Tool } from './tool';

export abstract class CronData {
	tools(): Tool[] {
		return [];
	}
}
