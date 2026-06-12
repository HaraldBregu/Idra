export function watch(): { close: () => Promise<void>; on: () => unknown } {
	return {
		close: async () => undefined,
		on: () => undefined,
	};
}

export default { watch };
