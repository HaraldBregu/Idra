import type { SessionState } from '../session';
import type { Config, RuntimeInput, RuntimeOutput } from '../types';
import { stream, type StreamOptions } from './run_stream';

export async function result(
	config: Config,
	session: SessionState,
	input: RuntimeInput,
	signal: AbortSignal,
	options: StreamOptions = {},
): Promise<RuntimeOutput> {
	let output: RuntimeOutput | undefined;
	for await (const event of stream(config, session, input, signal, options)) {
		if (event.type === 'run_finished') output = event.result;
	}
	if (!output) throw new Error('Run ended without a result.');
	return output;
}
