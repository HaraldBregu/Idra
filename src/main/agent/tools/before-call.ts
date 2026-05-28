export { type BeforeCallOutcome, type CallTracker } from './service';
export function newCallTracker() {
	return { calls: new Map<string, number>() };
}
export async function beforeToolCall() {
	return { allowed: true };
}
