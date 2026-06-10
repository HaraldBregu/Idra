import type { RuntimeTool } from '../types';

export abstract class Tool {
	abstract run(): RuntimeTool;
}
