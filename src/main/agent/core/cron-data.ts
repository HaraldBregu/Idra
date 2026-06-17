import type { Tool } from './tool';

export abstract class CronData {
	abstract tools(): Tool[];
}
