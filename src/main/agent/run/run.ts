import { appendRun, type SessionState } from '../session';
import type { Config, RuntimeEvent, RuntimeInput } from '../types';
import { stream } from './run_stream';

export async function* run(
	config: Config,
	session: SessionState,
	input: RuntimeInput,
	signal: AbortSignal,
): AsyncGenerator<RuntimeEvent> {
	try {
		for await (const event of stream(config, session, input, signal)) {
			appendRun(session, event);
			yield event;
		}
	} catch (error) {
		appendRun(session, {
			type: 'run_error',
			message: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}
}
