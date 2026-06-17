import type { Tool } from './tool';
import { Context } from './context';

class DefaultContext extends Context {}

export class CronData {
	constructor(readonly context = new DefaultContext()) {}

	tools(): Tool[] {
		return [];
	}
}
